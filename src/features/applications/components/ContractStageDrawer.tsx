import { useEffect, useMemo, useState } from 'react'
import {
  ChevronRight,
  ClipboardList,
  FileText,
  Search,
  Send,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import {
  createApplicationMessage,
  type ApplicationMessagePayload,
} from '@/features/applications/api'
import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail'
import { useUserListByRole } from '@/features/tasks/hooks/useTaskQueries'
import { useConfirmTaskMutation } from '@/features/tasks/hooks/useTaskMutations'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import type { Applicant, ApplicantAppVars, AssignedRole } from '@/types/application'

type Props = {
  open: boolean
  applicant?: Applicant
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number
  taskName?: string
  appVars?: ApplicantAppVars | null
  assignedRoles?: AssignedRole[]
  onClose: () => void
}

type PreviewTab =
  | 'cover'
  | 'agreement'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'invoice'
  | 'pla'
  | 'plInvoice'
  | '__old_cover'
  | '__old_agreement'

const DEFAULT_ANNUAL_FEE = '2500'
const LABELING_RULES = [
  'Packaging of certified product must include Product name, brand name, and Company name so a recipient can match it to the Letter of Certification.',
  'The OU may only be placed on products authorized and certified on your Schedule B. The OU-D must be used on Dairy products.',
  'Private Label Product may not bear the OU unless a Private Label Agreement (three-way licensing agreement) is signed.',
  'The OU symbol cannot be rubber-stamped or applied as a sticker separate from the original packaging.',
  'The OU does not dictate size, color, or placement, but recommends it appear conspicuously - typically right of the product name.',
  'Dairy products must have the "D" or "Dairy" in equal-size font to the OU symbol; not as a subscript.',
  'OU-certified product may not contain a non-certified food item.',
  'When bundling items of different status, the OU should appear on individual items, not the composite bag/tray.',
  'Not recommended to print the OU on blank boxes/cartons/bags, since not all products in a plant may be certified.',
  'A website/brochure bearing the OU must include "Products certified when bearing the OU symbol" or "Not all products are OU certified."',
]

type ContractPreviewProductRow = {
  ConsumerIndustrial?: string
  brandName?: string
  bulkShipped?: boolean | string
  certification?: string
  group?: string
  labelNo?: string | number
  labelCompany?: string
  labelName?: string
  status?: string
}

type ContractPreviewIngredientRow = {
  addedBy?: string
  addedDate?: string
  brand?: string
  certification?: string
  ingredient?: string
  manufacturer?: string
  ncrcId?: number | string
  packaging?: string
  source?: string
  status?: string
}

type AgreementClause = {
  id: string
  label: string
  text: string
}

type ClauseVersion = {
  n: number
  label: string
  name: string
  author: string
  ts: string
  clauses: AgreementClause[]
}

const BASE_AGREEMENT_CLAUSES: AgreementClause[] = [
  {
    id: 'recitals',
    label: 'Recitals',
    text: 'WHEREAS the OU performs Kosher certification throughout the world and is the exclusive owner of the OU Certification Mark, a registered trademark; and WHEREAS the OU and the Company desire for the OU to provide the OU Services with respect to the Products, in accordance with the terms set forth herein. NOW, THEREFORE, in consideration of the premises and covenants set forth herein, the Parties agree as follows:',
  },
  {
    id: 'I',
    label: 'I. Certification of Products',
    text: '(A) During the Term, and subject to the terms set forth herein, the OU agrees that each product of the Company listed on Schedule B shall be eligible for Certification. If a Company has more than one Plant, each Plant shall have its own exclusive Schedule B. "Kosher" shall mean that a Product complies with the kosher dietary laws, as determined by the OU in its sole discretion.',
  },
  {
    id: 'I-B-3-b',
    label: 'I.(B)(3)(b) Label Approval',
    text: "The Company shall provide the OU with a proof for each Product label before such label is printed. Within thirty (30) days following the OU's receipt of a label proof, the OU shall notify the Company whether such label is approved. The Company shall not make any material changes to an Approved Label without first obtaining the prior written consent of the OU.",
  },
  {
    id: 'II',
    label: 'II. Fees and Expenses',
    text: 'The Company agrees to timely pay to the OU an annual certification fee for each year during the Term. The first Annual Certification Fee shall be payable on the Effective Date. For each subsequent year, the fee shall be paid in full and in advance, at least fifteen (15) days prior to the beginning of each such year. The fee for the initial year is specified in Schedule C.',
  },
  {
    id: 'III',
    label: 'III. Confidentiality',
    text: 'Except as may otherwise be required by law, the OU shall not disclose to, or use for the benefit of, any other person any trade secrets, ingredients, suppliers, or formulae used by the Company in the manufacture of a Product. The fact of certification of a Product shall not be deemed Confidential Information.',
  },
  {
    id: 'VI',
    label: 'VI. Term; Termination',
    text: 'This Agreement shall commence on the Effective Date and continue until terminated in accordance with this Section. Either party may terminate upon written notice as provided herein. Upon termination, the Company shall immediately discontinue all use of the OU Symbol.',
  },
]

const STANDARD_AGREEMENT_BODY = [
  {
    title: 'RECITALS:',
    paragraphs: [
      'WHEREAS, among other things, the OU performs Kosher certification throughout the world, and is the exclusive owner of the OU Certification Mark, a registered trademark with the U.S. Patent and Trademark Office; and',
      'WHEREAS, in connection with its Kosher certification activities, the OU inspects, supervises and certifies as Kosher products produced, manufactured, packaged, labeled, or otherwise processed in food processing facilities; and',
      'WHEREAS, the OU and the Company desire for the OU to provide the OU Services to the Company with respect to the Products, all in accordance with the terms and subject to the conditions set forth herein.',
      'NOW, THEREFORE, in consideration of the premises and covenants set forth herein, and for other good and valuable consideration, the Parties hereto agree as follows:',
    ],
  },
  {
    title: 'I. Certification of Products.',
    paragraphs: [
      '(A) Certification. During the Term (as defined in Section VI), and subject to the terms and conditions set forth herein, the OU hereby agrees that each of the products of the Company listed on Schedule B attached hereto and incorporated herein by reference (each, a "Product," and, collectively, the "Products") shall be eligible for Certification (as defined below). If a Company has more than one Plant, each Plant shall have its own exclusive Schedule B.',
      'For purposes of this Agreement, (1) "Certification" shall mean (a) the issuance of a written statement by the OU to the Company, following the OU\'s receipt of a written request from the Company and following completion by the OU of the OU Services, that a Product is certified as Kosher by the OU, and (b) the Company and the OU entering into this Agreement, and (2) "Kosher" shall mean that a Product complies with the kosher dietary laws, restrictions and regulations, as determined by the OU in its sole discretion.',
      '(B) Certification Requirements. In connection with, and as a condition to obtain and maintain, the Certification:',
      '(1) Production Location. The Company shall produce, manufacture, process, package and label each Product only at the plant(s) listed on Schedule C attached hereto and incorporated herein by reference (each, a "Plant," and, collectively, the "Plants"), and the Company shall not cause or permit any product that is identical or similar to such Product (each, a "Similar Product") to be produced, manufactured, processed, packaged, or labeled at any other plant(s), whether or not such product bears the OU Symbol, without first obtaining the prior written consent of the OU. For the avoidance of doubt, a product with two different labels or brand names shall not be considered a Similar Product.',
      '(2) Ingredients.',
      '(a) The Company shall not use or store any ingredient in a Plant, whether or not such ingredient is used in a Product or is used for research and development, unless (i) such ingredient is listed on Schedule A attached hereto, which is hereby incorporated herein by reference (each, an "Ingredient," and, collectively, the "Ingredients"), or (ii) the Company has obtained the prior written consent of the OU to store or use ingredients that are not listed on Schedule A at such Plant, which consent may be granted or withheld in the OU\'s sole discretion. If Company has more than one Plant, each Plant shall have its own exclusive Schedule A.',
      '(b) The Company shall implement procedures with Plant personnel, which such procedures shall be reasonably acceptable to the OU, to assure that only Ingredients listed on Schedule A are being used or stored at a Plant. The Company shall regularly update the OU with the then-current list of the name(s) of the persons(s) responsible for such compliance.',
      '(c) The Company shall immediately notify the OU in writing of any change to an Ingredient or if an Ingredient is discontinued from use in a Plant.',
      '(d) The OU shall be the sole and exclusive arbiter of whether an ingredient is Kosher. If the OU determines, in its sole discretion, that an ingredient previously approved for use in a Product is no longer Kosher, or is no longer acceptable to the OU for any reason, the OU shall provide prompt notice of such determination to the Company, and the Company shall immediately discontinue use of that ingredient in any Product which carries the OU Certification.',
      '(3) Use of the OU Symbol.',
      '(a) The Company may not use the OU Symbol in any manner or on any label of a Product except under the terms and conditions, and in accordance with the procedures, set forth in this Agreement.',
      '(b) The Company shall provide the OU with a proof for each Product label before such label is printed for use with or on a Product. Within [thirty (30)] days following the OU\'s receipt of a label proof, the OU shall notify the Company whether such label is approved (if approved, such approved label, the "Approved Label"). If the Product for which the label proof has been submitted has already been approved by the OU for Certification, the OU shall not unreasonably withhold its approval of such label proof. The Company (i) shall not make any material changes to an Approved Label without first obtaining the prior written consent of the OU, and (ii) shall notify the OU of any change in the name of a Product no later than twenty (20) calendar days prior to the effective date of such name change.',
      '(c) The OU shall not provide Certification for any Product, unless (i) the OU Symbol appears on the Product package, label, or container, along with the name of the Product, and (ii) the specific word or letter listed on Schedule B, such as "D," "Dairy," "Fish," or "Meat," if applicable, appears next to the OU Symbol, however, if the Schedule B specifies that a Product is "Pareve", the word "Pareve" does not need to appear on the package, label or container. If the Company wishes to include the Pareve designation, the word Pareve must be spelled out in its entirety and may not be abbreviated. The use of an OU Symbol that does not comply to this Section I(B)(3)(c) shall be considered a violation of this Agreement and shall be subject to the provisions of Section VII hereof.',
      '(d) The OU Symbol shall be part of the printed Approved Label. The OU Symbol shall not be placed on a label using a rubber stamp, ink-jet, or adhesive sticker unless the Company obtains the prior written consent of the OU.',
      '(e) The OU Symbol shall be the only kosher certification that appears on the label of a Product, unless the Company obtains the prior written consent of the OU. No logo, emblem, symbol, or message from any other kosher supervising person or entity shall appear on any part of the product label of a Product.',
      '(f) Containers of a Product bearing the OU Symbol shall not contain any food in addition to such Product, such as a promotional insert, even if such food is separately wrapped, unless the Company obtains the prior written consent of the OU.',
      '(g) In the absence of obtaining the prior written consent of the OU, the OU Symbol may not be used on a label of a container that can be re-used for other products.',
      '(h) The Company shall maintain an organized, current and accurate record of all labels used in a Plant.',
      '(4) Production Procedures. With respect to each Product, the Company shall comply with each of the production procedures listed on Schedule D attached hereto and incorporated herein by reference (each, a "Production Procedure"). The Company shall immediately notify the OU in writing (a) if the Company ceases to produce or manufacture any Product, (b) if any material error occurs with respect to the packaging materials, labeling, product name, brand or label name, ingredient statement, or the OU Symbol, (c) in advance, if the Company becomes aware that it will not be able to comply with any Production Procedure for any reason, and/or (d) if the Company fails to comply with any Production Procedure for any reason. [Note: Schedule D should include issues regarding the certification of bulk shipments.]',
      '(5) Unused Labels. The Company shall not remove unused labels and/or packaging materials bearing the OU Symbol from a Plant without first obtaining the prior written consent of the OU; provided, however, that upon termination of this Agreement in accordance with Section VI, all unused labels and packaging materials bearing the OU Symbol shall be, at the OU\'s option, immediately (a) transferred to a new plant which has been certified by the OU, (b) destroyed, or the OU Symbol immediately excised therefrom, in each instance, in the presence of OU Representatives (as defined in Section IV below), or (c) remitted to the OU. The Company hereby agrees to pay the reasonable fees and expenses of the OU for the supervision of the Company\'s compliance with this Section I(B)(5) by OU Representatives.',
      '(6) Annual Certification Fee. The Company shall pay to the OU the Annual Certification Fee (as defined in Section II) in accordance with Section II.',
      '(7) Actions. The Company, at its own expense, shall take any and all actions reasonably required by the OU in connection with obtaining and/or maintaining a Certification.',
      '(8) Private Label Products. Certification of Private Label (as defined below) products shall be governed by a separate private label agreement among the OU, the Company and the applicable private label/distribution company. For purposes of this Agreement, "Private Label" shall mean a label or brand name that is not owned or controlled by the Company (e.g., a label that the Company uses pursuant to a licensing agreement).',
      '(9) No Passover Use. The Certifications contemplated by this Agreement do not include Certifications of the Products for Passover use. Certification of a Product for use on Passover requires a separate agreement between the Company and the OU.',
    ],
  },
  {
    title: 'II. Fees and Expenses.',
    paragraphs: [
      '(A) Annual Certification Fee. The Company agrees to timely and fully pay to the OU an annual certification fee (the "Annual Certification Fee") for each year during the Term. The first Annual Certification Fee shall be payable by the Company to the OU on the Effective Date for the period beginning on the Effective Date and ending on the first anniversary of the Effective Date. Thereafter, for each subsequent year during the Term, the Annual Certification Fee shall be paid by the Company to the OU, in full and in advance, at least fifteen (15) days prior to the beginning of each such subsequent year during the Term. The Annual Certification Fee for the initial year during the Term shall be specified in the Schedule C, and shall be paid to the OU in United States Dollars (USD). [FOR FOREIGN COMPANIES] To the extent that Company shall be required to withhold taxes from any fee or expenses payable to the OU, the amount of such fee or expense shall be increased so that the amount actually remitted to the OU shall equal the amount stated on such invoice from the OU. The amount of the Annual Certification Fee for subsequent years during the Term shall be subject to adjustments by the OU, in its sole discretion. The OU shall attempt to notify the Company of the amount of the Annual Certification Fee for each subsequent year during the Term at least thirty (30) days prior to the beginning of each such subsequent year.',
      '(B) Other Fees and Expenses. The Company may be subject to additional fees in addition to the Annual Certification Fee, such as special production fees, Passover certification fees, private label fees, and other fees and expenses referenced herein or contemplated hereby. The Company also shall pay the reasonable travel expenses of the OU Representative(s) in the event that an administrative visit or review by the OU is required or appropriate or as otherwise contemplated hereby. All fees and expenses payable by the Company to the OU hereunder, other than the Annual Certification Fee, shall be paid by the Company to the OU within twenty (20) calendar days following the Company\'s receipt of an invoice from the OU with respect to such fees and expenses.',
    ],
  },
  {
    title: 'III. Confidentiality.',
    paragraphs: [
      'Except as may otherwise be required by law, the OU shall not disclose to, or use for the benefit of, any other person or entity any trade secrets, ingredients, suppliers, formulae or secret processes used or employed by the Company in the connection of the manufacture of a Product (such information, "Confidential Information"). The fact of certification of a Product by the OU shall not be deemed Confidential Information, and, in the absence of a written agreement prohibiting such disclosure, the OU may disclose publicly whether a Product and/or a product is or is not certified as Kosher by the OU. In the event that the OU is required by subpoena, court order, or other legal or regulatory process, to disclose any Confidential Information (collectively, "Compelled Disclosures"), the OU shall provide prompt written notice to the Company (to the extent legally permitted) so that the Company, at its sole cost, may seek a protective order or other appropriate remedy. The Company shall be solely responsible for all costs and expenses incurred by the OU in connection with any such Compelled Disclosures, including, without limitation, reasonable attorneys\' fees, document collection and review costs, and costs of production and neither OU nor any of its attorneys shall be liable under this Agreement for Compelled Disclosure made pursuant to this paragraph.',
    ],
  },
  {
    title: 'IV. Inspection and Records.',
    paragraphs: [
      'OU inspector (the "OU Inspector") shall be permitted to enter into and to inspect the operations of each Plant at all times during regular business hours and at all times that such Plant is in operation, without prior notification to the Company. The Company shall provide the OU Inspector with access to any and all documents relevant to the Kosher status of a Product, including, without limitation, production records, formula cards, batch sheets, invoices for ingredients and access to personnel involved with research and development of products and ingredients. The Company shall also (A) provide the OU Inspector with reasonable access to governmental regulatory documents related to Plant operations, (B) permit the OU to make copies of such information as shall be reasonably necessary or convenient, as determined by the OU, in its sole discretion, in order for the OU to properly certify the Products, and (C) provide the OU Inspector with adequate instructions pertaining to the safety of the OU Inspector in connection with the inspection of a Plant. To the extent that OU Inspector uses Company equipment or equipment used at a facility, Company shall provide OU Inspector with adequate instruction pertaining to the safe usage of such equipment and a Company supervisor shall monitor OU Inspector\'s use of equipment as long as such equipment is being used by OU Inspector. The Company shall obtain the prior written consent of the OU before permitting any person or entity (other than an OU inspector) to inspect a Plant in order to determine compliance with Kosher laws.',
    ],
  },
  {
    title: 'V. Indemnification and Limitation of Liability.',
    paragraphs: [
      'The Company agrees to indemnify and hold the OU harmless from and against demands, claims, losses, costs, damages, liabilities, penalties, fines and expenses arising out of or relating to the OU\'s Certification of any Product of the Company as Kosher, the Company\'s breach of this Agreement, unauthorized actions, or the safety of any Product.',
      'In no event shall the OU be liable to the Company for direct, special, incidental, indirect, punitive or consequential damages, loss of use of capital, lost profits, lost revenues, commissions, or compensation of any kind arising out of or related to this Agreement.',
    ],
  },
  {
    title: 'VI. Term; Termination.',
    paragraphs: [
      '(A) Subject to this Section VI, the term (the "Term") of this Agreement shall commence on the Effective Date and shall terminate on the anniversary of the Effective Date (the "Initial Termination Date"); provided, however, that this Agreement shall be renewed and extended automatically for periods of one (1) additional year following an anniversary the Initial Termination Date, unless a Party terminates this Agreement upon at least thirty (30) calendar days written notice to the other Party prior to the Initial Termination Date.',
      '(B) Notwithstanding Section VI(A) above, the OU, in its sole discretion, may terminate this Agreement immediately upon written notice to the Company in the event:',
      '(1) The Company ceases to produce or manufacture a Product or closes a Plant;',
      '(2) The Company fails to perform or observe any of its covenants, obligations, conditions, or requirements under this Agreement, and, to the extent that, in the OU\'s sole discretion, any such failure can be cured, such failure continues for more than five (5) calendar days after the OU notifies the Company of such failure;',
      '(3) Notwithstanding Section VI(B)(2) above, with respect to any Product, Plant (including, without limitation, any of the equipment contained in any such Plant) or Ingredient, the Company violates or breaches, or fails to observe, any kosher dietary laws, restrictions and regulations, as determined by the OU in its sole discretion;',
      '(4) Any representation or warranty made or furnished by the Company in connection with this Agreement shall be false, incorrect, incomplete, or misleading when made or furnished;',
      '(5) The Company commits any act of fraud or dishonesty or other misrepresentation with respect to its business or in connection with its performance under this Agreement (as determined by the OU in its sole discretion), or the OU determines, in its sole discretion, that termination of this Agreement is in the best interests of the OU; or',
      '(6) The Company (and/or any of its directors or officers) (a) is accused of, or enters a plea of guilty or nolo contendere to, any felony, or to any misdemeanor involving dishonesty or moral turpitude, (b) violates any law, rule or regulation under federal, state or local law (including, without limitation, with respect to health, sanitation and manufacturing), (c) violates the policies and/or procedures of the OU, or (d) takes any action, or omits to take any action, that results in the OU determining, in its sole discretion, that termination of this Agreement is in the best interests of the OU.',
      '(C) The Company may not use the OU Symbol on any Product, advertisement, or otherwise, after the termination of this Agreement.',
      '(D) (1) Termination or expiration of this Agreement for any reason shall be without prejudice to any rights that shall have accrued to the benefit of any Party prior to such termination or expiration. Such termination or expiration shall not relieve any Party from obligations which survive termination of this Agreement.',
      '(2) If this Agreement is terminated for any reason, all of the Parties\' rights and obligations under, and/or the provisions contained in, Sections I(B)(5), II, III, V, VI(D), VII, VIII, IX and X shall survive the termination or expiration of this Agreement.',
    ],
  },
  {
    title: 'VII. Violations.',
    paragraphs: [
      '(A) Upon the Company\'s breach or violation of any of the terms or conditions of this Agreement, as determined by the OU in its sole discretion, the OU shall have the right to demand, and the Company agrees to implement and/or take, without limitation, one or more of the following remedies and/or actions, among others (as directed by the OU):',
      '(1) Kosherization of affected equipment in a Plant, to be performed under the supervision of OU Representatives;',
      '(2) Increased supervision by the OU for a probationary period deemed proper by the OU;',
      '(3) Immediate removal of unapproved ingredients from a Plant;',
      '(4) Immediate recall of a product from the market;',
      '(5) Notices to be drafted by the OU to be published, at the Company\'s expense, in newspapers, magazines and other media and/or distributed by the OU notifying the public of the non-approved status of a Product, with a maximum cost to the Company of $5,000.00; and/or',
      '(6) Termination of this Agreement, and destruction of all packaging material in accordance with Section I(B)(5).',
      '(B) Upon the Company\'s breach or violation of any of the terms or conditions of this Agreement, as determined solely by the OU in its sole discretion, the Company, at its own expense, shall fully cooperate with the OU and take any and all actions reasonably required by the OU to cure or remedy such breach or violation.',
      '(C) The Company agrees and acknowledges that the remedies and/or actions required to be implemented and/or taken by the Company pursuant to this Section VII are reasonable and necessary, and are without prejudice to other actions the OU is permitted to take in the event of a breach of this Agreement or a breach of OU rules or regulations pursuant to this Agreement.',
    ],
  },
  {
    title: 'VIII. Unauthorized Use of the OU Symbol; Liquidated Damages.',
    paragraphs: [
      'If, at any time, the Company (A) uses or displays the OU Symbol in an unauthorized manner or on any label of a product of the Company that is not permitted by the terms and provisions of this Agreement, and/or (B) is not in strict compliance with Section I(B)(5) of this Agreement, the Company hereby agrees to pay to the OU, as liquidated damages, $[750].00 for each day that the Company uses or displays the OU Symbol in such unauthorized manner or fails to strictly comply with Section I(B)(5). The Company hereby agrees that the $[750].00 per day payment amount is (1) a reasonable estimate of the damages that the OU will likely sustain as a result of the Company\'s unauthorized use or failure of strict compliance, and (2) not intended to constitute a penalty for any purpose. In accordance with Section X(E), the OU\'s exercise and/or enforcement of any of its rights set forth in this Section VIII shall not preclude and/or prejudice any other rights and/or remedies (in law and/or in equity) that the OU may have in the event that any provision of this Agreement was not performed in accordance with its specific terms or was otherwise breached by the Company.',
    ],
  },
  {
    title: 'IX. Adding and Removing Products, Plants and Ingredients.',
    paragraphs: [
      '(A) Products.',
      '(1) Adding Products. In the event the Company desires to add a product to Schedule B, the Company shall submit a Product Approval Request Form, substantially in the form attached hereto as Exhibit A (each, a "Product Approval Request Form"), to the OU for its consideration. The OU shall either initiate a process to review and inspect the product, its ingredients and manufacturing process, or determine, in its sole discretion, whether such product is Kosher and whether such product shall be added to Schedule B and become a Product hereunder. If the OU determines, in its sole discretion, that such product is Kosher and shall be added to Schedule B and become a Product hereunder, then the Parties shall amend Schedule B to include such product.',
      '(2) Removing Products.',
      '(1) OU. The OU has the right, in its sole discretion, to amend Schedule B to remove a Product in the event that (a) such Product is no longer Kosher, as determined by the OU, in its sole discretion, (b) such Product is discontinued, or (c) the product label for such Product does not properly display the OU Symbol. In the event of such amendment, the OU shall promptly notify the Company, in writing.',
      '(2) Company. In the event that the Company desires to remove a Product listed on Schedule B, the Company shall submit a Product Termination Form, substantially in the form attached hereto as Exhibit B (each, a "Product Termination Form"), to the OU. The Company shall have the right to submit a Product Termination Form to the OU with respect to any Product in the event that (a) such Product is no longer kosher, (b) such Product is discontinued, (c) the product label for such Product no longer properly displays the OU Symbol, or (d) the Company no longer desires for the product label for such Product to display the OU Symbol.',
      '(B) Plants.',
      '(1) Adding Plants. In the event the Company desires to add a plant to Schedule C, the Company shall submit an Application for Kosher Certification Form, substantially in the form attached hereto as Exhibit C (each, an "Application for Kosher Certification Form"), to the OU for its consideration. The OU shall determine, in its sole discretion, whether such plant shall be visited, reviewed, analyzed and processed for certification. If the OU determines, in its sole discretion, that such plant shall be added to Schedule C and become a Plant hereunder, then the Parties shall amend Schedule C to include such plant.',
      '(2) Removing Plants. In the event that the Company desires to remove a Plant from Schedule C, the Company shall submit a Termination Form, substantially in the form attached hereto as Exhibit D (each, an "Termination Form"), to the OU.',
      '(C) Ingredients.',
      '(1) Adding Ingredients. In the event the Company desires to add an Ingredient to Schedule A, the Company shall submit a Request for Ingredient Approval Form, substantially in the form attached hereto as Exhibit E (each, a "Request for Ingredient Approval Form"), to the OU for its consideration. The OU shall determine, in its sole discretion, whether such ingredient shall be added to Schedule A and become an Ingredient hereunder. If the OU determines, in its sole discretion, that such ingredient shall be added to Schedule A and become an Ingredient hereunder, then the Parties shall amend Schedule A to include such ingredient.',
      '(2) Removing Ingredients. The OU has the right, in its sole discretion, to unilaterally amend Schedule A to remove an Ingredient in the event that such Ingredient is no longer Kosher, as determined by the OU, in its sole discretion. In the event of such amendment, the OU shall promptly notify the Company, in writing.',
    ],
  },
  {
    title: 'X. Miscellaneous.',
    paragraphs: [
      '(A) Representations and Warranties. The Company hereby represents and warrants to the OU that, as of the Effective Date as follows:',
      '(1) The Company has all requisite power and authority to execute this Agreement and perform the Company\'s obligations hereunder.',
      '(2) This Agreement constitutes a valid and binding obligation of the Company, enforceable against the Company in accordance with its terms.',
      '(B) Governing Law; Venue.',
      '(1) Governing Law. This Agreement is deemed to be executed and delivered in the State of New York and shall be construed and enforced in accordance with the laws and decisions of the State of New York applicable to contracts made and performed entirely within the State of New York, without regard to the State of New York\'s conflicts of law provisions.',
      '(2) Venue. Each Party unconditionally and irrevocably submits to and accepts the exclusive jurisdiction of any state or federal court of competent jurisdiction located in the County, State of New York or the City of New York for the purposes of any suit, action or other proceeding between the Parties, whether arising out of, related to, or resulting from this Agreement or otherwise. Each Party further unconditionally and irrevocably waives any objections, including improper venue or based on the grounds of forum non conveniens, which it may have to the bringing of any action, suit or proceeding between the Parties, whether arising out of, related to, or resulting from this Agreement or otherwise, in any state or federal courts located in the County, State of New York or the City of New York, and hereby further and unconditionally and irrevocably waives and agrees not to plead or claim in any such court that any such action, suit or proceeding brought in any such court has been brought in an inconvenient or inappropriate forum.',
      '(C) Waiver; Amendment. The failure of any Party to insist upon strict performance of any of the terms or provisions of this Agreement shall not be construed as a waiver or relinquishment for the future of any such terms or provisions. Rather such terms or provisions shall continue and remain in full force and effect. No waiver shall be deemed to have been made unless the waiver is made in writing and is signed by the Party making the waiver. Except as otherwise provided in this Agreement (including, without limitation, pursuant to Section IX), this Agreement (including the Schedules and Exhibits attached hereto and incorporated herein by reference) may only be amended or modified by a written instrument signed by each of the OU and the Company.',
      '(D) Severability. If any portion of this Agreement shall be declared invalid by any order, decree or judgment of a court having jurisdiction over the Parties and/or the subject matter of this Agreement, this Agreement shall be construed as if such portion had not been inserted herein except when construction under those circumstances would operate as an undue hardship on any Party or constitute a substantial deviation from the general intent and purpose of the Parties as reflected in this Agreement.',
      '(E) Injunctions. The Company agrees and acknowledges that irreparable damage will occur to the OU in the event that any of the provisions of this Agreement are not performed in accordance with the specific terms of this Agreement or in the event any material terms of this Agreement are breached by the Company. In the event of any such deficiency in the performance of the provisions of this Agreement or any such breach by the Company, the Company agrees that the OU shall be entitled to an injunction to prevent such deficiencies in performance or such breaches and to enforce the terms and provisions of this Agreement in any court of competent jurisdiction, such remedy being in addition to any other remedy to which the OU may be entitled at law or in equity.',
      '(F) Attorneys Fees. Notwithstanding any other provision contained herein or in any other document to the contrary, the Company shall pay all costs, fees and expenses, including attorneys\' fees, incurred by the OU (1) in enforcing or implementing its rights and/or remedies under this Agreement, and/or (2) in connection with any litigation or dispute between the Parties arising out of, related to, or resulting from this Agreement.',
      '(G) Headings. The headings of Sections are inserted only as a matter of convenience and in no way define, limit, construe, or describe the scope or intent of the Sections nor in any way affect this Agreement.',
      '(H) Assignment. The Company\'s rights and obligations hereunder may not be assigned by the Company without the prior written consent of the OU, which consent shall not be unreasonably conditioned, withheld, or delayed.',
      '(I) Relationship of Parties. No Party is, and no Party shall hold itself out as, an agent, legal representative, partner, subsidiary, joint venturer or employee, of another Party. No Party shall bind or obligate, or attempt to bind or obligate, another Party in any way or manner, nor shall any Party represent that it has any right to do so.',
      '(J) Symbols; Press Releases.',
      '(1) Except as otherwise provided for in this Agreement (including Section X(J)(2) below), without the prior written consent of the OU, the Company may not (a) use the names, logos, emblems, symbols, trademarks, service marks and copyright rights of the OU, and/or (b) engage in any advertising; press release or other public communications; web site or internet marketing; electronic mail solicitation or marketing; or direct mail or facsimile transmission or telemarketing campaigns (collectively, "Advertisement"), which refer to or mention the OU, the OU Certification, or the OU Symbol.',
      '(2) Notwithstanding Section X(J)(1) above, so long as the Company is in compliance with the terms and conditions of this Agreement, (a) the OU Symbol may appear in the Company\'s Advertisement of a Product if the Advertisement includes a picture, photo, drawing or other likeness of the packaging of such Product and the OU Symbol is displayed, as it typically and normally appears, on such packaging, and (b) the Company may make reference in its Advertisements of a Product that such Product has OU Certification so long as the Company only states that the Product is "certified as kosher by the OU."',
      '(K) Notices. Any notices required or permitted hereunder shall be given to the appropriate Party at the address specified on the signature page hereto or at such other address as the Party shall specify in writing. Such notice shall be deemed given upon personal delivery to the appropriate address, one (1) business day after dispatch if sent by a nationally recognized courier or overnight delivery service, on the date of dispatch if sent by facsimile for which confirmation of transmission is provided, or, if sent by certified or registered mail, three (3) business days after the date of mailing.',
    ],
  },
]

const cloneAgreementClauses = (clauses: AgreementClause[]) =>
  clauses.map((clause) => ({ ...clause }))

const initialClauseVersion = (clauses: AgreementClause[]): ClauseVersion => ({
  n: 1,
  label: 'v1',
  name: 'Original',
  author: 'System',
  ts: 'generated from template',
  clauses: cloneAgreementClauses(clauses),
})

const textValue = (value: unknown) => String(value ?? '').trim()

const getDefaultEffectiveDate = () => {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
}

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatFullDate = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatShortDate = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return `${String(parsed.getMonth() + 1).padStart(2, '0')}/${String(parsed.getDate()).padStart(
    2,
    '0',
  )}/${parsed.getFullYear()}`
}

const getYearFromDateValue = (value?: string | null) => {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear()
}

const formatMonthDay = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}

const formatCurrency = (value: string | number) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '$0.00'
  return number.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

const hasDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'boolean') return true
  return String(value).trim() !== ''
}

const toYesNoValue = (value: boolean | string | undefined) => {
  if (value === true) return 'Yes'
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'y' || normalized === 'yes' || normalized === 'true') return 'Yes'
  if (normalized === 'n' || normalized === 'no' || normalized === 'false') return 'No'
  return '-'
}

const getAssignedRoleValue = (assignedRoles: AssignedRole[] | undefined, roleName: string) => {
  const target = roleName.toLowerCase()
  for (const role of assignedRoles ?? []) {
    const match = Object.entries(role).find(([key, value]) => {
      if (key === 'isPrimary') return false
      return key.toLowerCase() === target && typeof value === 'string' && value.trim()
    })
    if (match && typeof match[1] === 'string') {
      return match[1].trim()
    }
  }
  return ''
}

const getPrimaryContact = (
  contacts?: Array<Record<string, unknown>>,
): { name: string; email: string; title: string } => {
  const contact =
    contacts?.find((item) => String(item.type ?? item.Type ?? '').toLowerCase() === 'primary contact') ??
    contacts?.find((item) => String(item.IsPrimaryContact ?? item.isPrimaryContact ?? '').toLowerCase() === 'true') ??
    contacts?.[0]

  const first = textValue(contact?.FirstName ?? contact?.firstName ?? contact?.contactFirst)
  const last = textValue(contact?.LastName ?? contact?.lastName ?? contact?.contactLast)
  const name =
    textValue(contact?.name ?? contact?.Name) || [first, last].filter(Boolean).join(' ') || 'Company Contact'
  const email = textValue(contact?.email ?? contact?.Email ?? contact?.EMail ?? contact?.contactEmail)
  const title = textValue(contact?.role ?? contact?.Role ?? contact?.Title ?? contact?.jobTitle1)

  return { name, email, title }
}

const getPreviewTabLabel = (tab: PreviewTab) => {
  switch (tab) {
    case 'invoice':
      return 'Invoice'
    case 'agreement':
      return 'Agreement'
    case 'a':
      return 'A - Ingred'
    case 'b':
      return 'B - Prod'
    case 'c':
      return 'C - Plants'
    case 'd':
      return 'D - Proc'
    case 'e':
      return 'E - Label'
    case 'cover':
      return 'Cover'
    case 'pla':
      return 'PLA'
    case 'plInvoice':
      return 'PL Invoice'
    default:
      return 'Preview'
  }
}

const getPreviewTabOrder = (tab: PreviewTab) =>
  ['invoice', 'agreement', 'a', 'b', 'c', 'd', 'e', 'cover', 'pla', 'plInvoice'].indexOf(tab)

function Section({
  title,
  count,
  children,
}: {
  title: React.ReactNode
  count?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[10px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.7px] text-gray-700">
        {title}
        {count ? (
          <span className="ml-auto text-[11.5px] font-medium normal-case tracking-normal text-gray-400">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function MergeField({
  token,
  value,
  emptyWidth = 'min-w-[110px]',
}: {
  token: string
  value?: React.ReactNode
  emptyWidth?: string
}) {
  if (value === null || value === undefined || value === '') {
    return (
      <span
        title={`{{${token}}}`}
        className={`inline-block ${emptyWidth} border-b border-dashed border-slate-400 align-baseline`}
      >
        &nbsp;
      </span>
    )
  }

  return (
    <span
      title={`{{${token}}}`}
      className="rounded-sm border-b-2 border-yellow-600 bg-yellow-200 px-1 font-semibold text-slate-900"
    >
      {value}
    </span>
  )
}

function TogglePillGroup({
  value,
  onChange,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: {
  value: boolean
  onChange: (value: boolean) => void
  trueLabel?: string
  falseLabel?: string
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        {trueLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          !value ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        {falseLabel}
      </button>
    </div>
  )
}

export function ContractStageDrawer({
  open,
  applicant,
  applicationId,
  applicationName,
  taskInstanceId,
  taskName,
  appVars,
  assignedRoles,
  onClose,
}: Props) {
  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const { email, token, username } = useUser()
  const { data: applicationDetail } = useApplicationDetail(open ? resolvedApplicationId : undefined)
  const isNewCompanyContract = applicant?.isNewCompany !== false
  const {
    data: rcLookupList = [],
    isError: isRcLookupError,
    isLoading: isRcLookupLoading,
  } = useUserListByRole('api/vSelectNCRC', { enabled: open && isNewCompanyContract })
  const confirmTaskMutation = useConfirmTaskMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => toast.error(message),
  })

  const [previewTab, setPreviewTab] = useState<PreviewTab>('invoice')
  const [showMergeFieldsHint, setShowMergeFieldsHint] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState(getDefaultEffectiveDate)
  const [annualFee, setAnnualFee] = useState(DEFAULT_ANNUAL_FEE)
  const [certificationInvoiceComment, setCertificationInvoiceComment] = useState('')
  const [includeInvoiceComment, setIncludeInvoiceComment] = useState(false)
  const [productionProcedures, setProductionProcedures] = useState('')
  const [noProductionProcedures, setNoProductionProcedures] = useState(true)
  const [legalReviewNeeded, setLegalReviewNeeded] = useState(false)
  const [legalApproved, setLegalApproved] = useState(false)
  const [agreementClauses, setAgreementClauses] = useState<AgreementClause[]>(() =>
    cloneAgreementClauses(BASE_AGREEMENT_CLAUSES),
  )
  const [clauseVersions, setClauseVersions] = useState<ClauseVersion[]>(() => [
    initialClauseVersion(BASE_AGREEMENT_CLAUSES),
  ])
  const [activeClauseVersion, setActiveClauseVersion] = useState(1)
  const [showClauseChanges, setShowClauseChanges] = useState(false)
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null)
  const [editingClauseText, setEditingClauseText] = useState('')
  const [packageGenerated, setPackageGenerated] = useState(false)
  const [contractSigned, setContractSigned] = useState(false)
  const [invoicePaid, setInvoicePaid] = useState(false)
  const [plaBodyOpen, setPlaBodyOpen] = useState(false)
  const [selectedPlaCompany, setSelectedPlaCompany] = useState('')
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [selectedRcLookupKey, setSelectedRcLookupKey] = useState('')
  const [rcSearch, setRcSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setPreviewTab('invoice')
    setShowMergeFieldsHint(false)
    setLegalApproved(false)
    setPackageGenerated(false)
    setContractSigned(false)
    setInvoicePaid(false)
    setShowEmailPreview(false)
    setEmailSent(false)
    setEffectiveDate(getDefaultEffectiveDate())
    setAnnualFee(DEFAULT_ANNUAL_FEE)
    setCertificationInvoiceComment('')
    setIncludeInvoiceComment(false)
    setProductionProcedures('')
    setNoProductionProcedures(true)
    setAgreementClauses(cloneAgreementClauses(BASE_AGREEMENT_CLAUSES))
    setClauseVersions([initialClauseVersion(BASE_AGREEMENT_CLAUSES)])
    setActiveClauseVersion(1)
    setShowClauseChanges(false)
    setEditingClauseId(null)
    setEditingClauseText('')
    setPlaBodyOpen(false)
    setSelectedPlaCompany('')
    setSelectedRcLookupKey('')
    setRcSearch('')
  }, [open, taskInstanceId])

  const detailAssignedRoles = applicationDetail?.assignedRoles ?? assignedRoles
  const existingRcName =
    getAssignedRoleValue(detailAssignedRoles, 'RC') ||
    textValue(applicant?.assignedRC) ||
    textValue(username) ||
    'Assigned RC'
  const existingRcEmail = email || (username && username.includes('@') ? username : 'rc@ou.org')
  const rcOptions = useMemo(
    () =>
      rcLookupList
        .map((item) => ({
          lookupKey: textValue(item.lookupKey || item.id || item.userName || item.name),
          name: textValue(item.fullName || item.name || item.userName || item.id),
          userName: textValue(item.userName || item.id),
          email: textValue(item.email),
        }))
        .filter((item) => item.lookupKey && item.name),
    [rcLookupList],
  )
  const selectedRc = rcOptions.find((option) => option.lookupKey === selectedRcLookupKey)
  const filteredRcOptions = useMemo(() => {
    const query = rcSearch.trim().toLowerCase()
    if (!query) return rcOptions

    return rcOptions.filter((option) =>
      [option.name, option.userName, option.email].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [rcOptions, rcSearch])
  const rcName = isNewCompanyContract ? selectedRc?.name || 'Select RC' : existingRcName
  const rcEmail = isNewCompanyContract ? selectedRc?.email || '' : existingRcEmail
  const ncrcName = textValue(username) || 'Current User'
  const detailCompany = applicationDetail?.company?.[0]
  const detailCompanyRecord = detailCompany as Record<string, unknown> | undefined
  const companyName = textValue(applicationName || applicant?.company || detailCompany?.name) || 'Application'
  const companyAddress = useMemo(() => {
    const address = applicationDetail?.companyAddresses?.[0]
    if (!address) return textValue(applicant?.plant)
    return [address.street, address.line2, address.city, address.state, address.zip, address.country]
      .filter(Boolean)
      .join(', ')
  }, [applicant?.plant, applicationDetail?.companyAddresses])
  const companyPhone = textValue(
    detailCompanyRecord?.phone ??
      detailCompanyRecord?.Phone ??
      detailCompanyRecord?.telephone ??
      detailCompanyRecord?.Telephone ??
      '',
  )
  const plantLabel =
    textValue(applicant?.plant) ||
    textValue(applicationDetail?.plants?.[0]?.name) ||
    textValue(applicationDetail?.plants?.[0]?.plantId) ||
    'Plant'
  const plantAddress = useMemo(() => {
    const plantAddressRecord = applicationDetail?.plantAddresses?.[0]
    if (!plantAddressRecord) return companyAddress
    return [
      plantAddressRecord.street,
      plantAddressRecord.line2,
      plantAddressRecord.city,
      plantAddressRecord.state,
      plantAddressRecord.zip,
      plantAddressRecord.country,
    ]
      .filter(Boolean)
      .join(', ')
  }, [applicationDetail?.plantAddresses, companyAddress])
  const contact = useMemo(
    () =>
      getPrimaryContact(
        applicationDetail?.companyContacts as Array<Record<string, unknown>> | undefined,
      ),
    [applicationDetail?.companyContacts],
  )
  const contractIngredients = useMemo(
    () =>
      ((applicationDetail?.ingredients as ContractPreviewIngredientRow[] | undefined) ?? []).filter(
        Boolean,
      ),
    [applicationDetail?.ingredients],
  )
  const contractProducts = useMemo(
    () => ((applicationDetail?.products as ContractPreviewProductRow[] | undefined) ?? []).filter(Boolean),
    [applicationDetail?.products],
  )
  const privateLabelGroups = useMemo(() => {
    const groups = new Map<string, ContractPreviewProductRow[]>()

    contractProducts.forEach((product) => {
      const labelCompany = textValue(product.labelCompany)
      const isPrivateLabel =
        Boolean(labelCompany) && labelCompany.toLowerCase() !== companyName.toLowerCase()

      if (!isPrivateLabel) return
      groups.set(labelCompany, [...(groups.get(labelCompany) ?? []), product])
    })

    return Array.from(groups.entries()).map(([labelCompany, products]) => ({
      labelCompany,
      products,
    }))
  }, [companyName, contractProducts])
  const selectedPrivateLabelGroup =
    privateLabelGroups.find((group) => group.labelCompany === selectedPlaCompany) ?? privateLabelGroups[0]
  const hasPrivateLabelAgreements = privateLabelGroups.length > 0
  const selectedPrivateLabelInvoiceCompany =
    selectedPrivateLabelGroup?.labelCompany ?? privateLabelGroups[0]?.labelCompany ?? ''
  const selectedPrivateLabelInvoiceId = selectedPrivateLabelInvoiceCompany
    ? `PL-${resolvedApplicationId ?? 'DRAFT'}-${privateLabelGroups.findIndex(
        (group) => group.labelCompany === selectedPrivateLabelInvoiceCompany,
      ) + 1}`
    : 'PL-DRAFT'
  const selectedPrivateLabelInvoiceAccount = selectedPrivateLabelInvoiceCompany
    ? `PL-${String(resolvedApplicationId ?? 'DRAFT')}`
    : 'PL-DRAFT'
  const contractTypeLabel = isNewCompanyContract
    ? 'New Company Certification'
    : 'Plant Addendum (existing company)'
  const maxClauseVersion = Math.max(...clauseVersions.map((version) => version.n))
  const isLatestClauseVersion = activeClauseVersion === maxClauseVersion
  const visibleAgreementClauses =
    clauseVersions.find((version) => version.n === activeClauseVersion)?.clauses ?? agreementClauses
  const originalAgreementClauses = clauseVersions[0]?.clauses ?? BASE_AGREEMENT_CLAUSES
  const agreementClausesEditable = legalReviewNeeded && !legalApproved && isLatestClauseVersion
  const saveClauseChange = (clauseId: string) => {
    const currentClause = agreementClauses.find((clause) => clause.id === clauseId)
    if (!currentClause) return

    const nextText = editingClauseText.trim()
    setEditingClauseId(null)
    setEditingClauseText('')

    if (!nextText || nextText === currentClause.text) return

    const nextClauses = agreementClauses.map((clause) =>
      clause.id === clauseId ? { ...clause, text: nextText } : clause,
    )
    const nextVersionNumber = maxClauseVersion + 1
    const editedClause = nextClauses.find((clause) => clause.id === clauseId)

    setAgreementClauses(nextClauses)
    setClauseVersions((versions) => [
      ...versions,
      {
        n: nextVersionNumber,
        label: `v${nextVersionNumber}`,
        name: `Edited ${editedClause?.label ?? 'Clause'}`,
        author: 'Legal',
        ts: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        clauses: cloneAgreementClauses(nextClauses),
      },
    ])
    setActiveClauseVersion(nextVersionNumber)
    setShowClauseChanges(true)
    toast.success(`Saved as v${nextVersionNumber} - change captured for Legal review`)
  }

  const invoiceNumber = `KCM-${resolvedApplicationId ?? 'DRAFT'}`
  const invoiceAccountNumber = resolvedApplicationId ? `OU-${resolvedApplicationId}` : 'OU-DRAFT'
  const invoiceDate = formatShortDate(effectiveDate)
  const invoiceAmount = formatCurrency(annualFee)
  const invoiceTotal = `${invoiceAmount} USD`
  const paymentCycleYear = getYearFromDateValue(effectiveDate)
  const companyPaymentCycleStart =
    textValue(appVars?.companyPaymentCycleStart) ||
    textValue(appVars?.paymentCycleStart) ||
    textValue(appVars?.cycleStart) ||
    textValue((applicant as Record<string, unknown> | undefined)?.companyPaymentCycleStart) ||
    textValue((applicant as Record<string, unknown> | undefined)?.paymentCycleStart) ||
    textValue((applicant as Record<string, unknown> | undefined)?.cycleStart) ||
    `${paymentCycleYear}-01-01`
  const companyPaymentCycleEnd =
    textValue(appVars?.companyPaymentCycleEnd) ||
    textValue(appVars?.paymentCycleEnd) ||
    textValue(appVars?.cycleEnd) ||
    textValue((applicant as Record<string, unknown> | undefined)?.companyPaymentCycleEnd) ||
    textValue((applicant as Record<string, unknown> | undefined)?.paymentCycleEnd) ||
    textValue((applicant as Record<string, unknown> | undefined)?.cycleEnd) ||
    `${paymentCycleYear}-12-31`

  const packageItems = [
    'Certification Agreement',
    'Schedule A - Ingredients',
    'Schedule B - Products',
    'Schedule C - Plants & Fee',
    'Schedule D - Production Procedures',
    'Schedule E - Labeling Requirements',
    'Certification Invoice',
    ...(hasPrivateLabelAgreements
      ? privateLabelGroups.map((group) => `Private Label Agreement - ${group.labelCompany}`)
      : []),
  ]
  const coverPackageItems = [
    {
      label: 'Certification Agreement',
      sub: `Master agreement - ${isNewCompanyContract ? 'new company' : 'plant addendum'}`,
    },
    {
      label: 'Schedule A - Ingredients',
      sub: 'Approved ingredients list',
    },
    {
      label: 'Schedule B - Products',
      sub: hasPrivateLabelAgreements ? 'In-house + private-label products' : 'Certified products',
    },
    {
      label: 'Schedule C - Plants & Fee',
      sub: `${plantLabel || 'Plant'} - ${formatCurrency(annualFee)}/yr`,
    },
    {
      label: 'Schedule D - Production Procedures',
      sub: noProductionProcedures ? 'None' : 'Specified',
    },
    {
      label: 'Schedule E - Labeling Requirements',
      sub: 'OU symbol & label use',
    },
    {
      label: 'Contract Invoice',
      sub: `${invoiceNumber} - ${formatCurrency(annualFee)} - ${invoicePaid ? 'paid' : 'awaiting payment'}`,
    },
    ...privateLabelGroups.map((group) => ({
      label: `Private Label Agreement - ${group.labelCompany}`,
      sub: `${group.products.length} product${group.products.length === 1 ? '' : 's'} - incl. Schedule A + Invoice`,
    })),
  ]
  const coverSeparateAttachments = [
    {
      label: 'Certification Invoice',
      sub: `${invoiceNumber} - ${formatCurrency(annualFee)} - separate attachment`,
      file: `Certification_Invoice_${companyName.replace(/[^A-Za-z0-9]+/g, '_')}.pdf`,
      desc: `${invoiceNumber} - ${formatCurrency(annualFee)} - ${invoicePaid ? 'paid' : 'awaiting payment'}`,
      tab: 'invoice' as PreviewTab,
    },
    ...privateLabelGroups.map((group) => ({
      label: `Private Label Agreement - ${group.labelCompany}`,
      sub: 'agreement + PL invoice in one document - created by Yudi - separate attachment',
      file: `PLA_${group.labelCompany.replace(/[^A-Za-z0-9]+/g, '_')}.pdf`,
      desc: `${group.labelCompany} - agreement + PL invoice (one document)`,
      tab: 'pla' as PreviewTab,
    })),
  ]

  const readyToGenerate =
    Boolean(effectiveDate) &&
    Boolean(annualFee) &&
    (!isNewCompanyContract || Boolean(selectedRc)) &&
    (noProductionProcedures || Boolean(productionProcedures.trim())) &&
    (!legalReviewNeeded || legalApproved)
  const readyToAdvance = packageGenerated && contractSigned && invoicePaid
  const contractProgressSteps = [
    { label: 'Generate Inv.', complete: packageGenerated },
    { label: 'Contract Sent', complete: emailSent },
    { label: 'Contract signed', complete: contractSigned },
    { label: 'Paid', complete: invoicePaid },
  ].map((step, index, steps) => {
    const firstIncompleteIndex = steps.findIndex((item) => !item.complete)
    return {
      ...step,
      current: firstIncompleteIndex === index,
    }
  })
  const billingLines =
    (companyAddress || plantAddress || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .length > 1
      ? (companyAddress || plantAddress)
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
      : [companyAddress || plantAddress || 'Address on file']
  const invoiceTermStart = (() => {
    if (!isNewCompanyContract) return formatFullDate(effectiveDate)
    const parsed = new Date(`${effectiveDate}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return formatFullDate(effectiveDate)
    return formatFullDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1).toISOString().slice(0, 10))
  })()
  const invoiceTermEnd = (() => {
    if (!isNewCompanyContract) return formatFullDate(companyPaymentCycleEnd)
    const parsed = new Date(`${effectiveDate}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return formatFullDate(effectiveDate)
    return formatFullDate(new Date(parsed.getFullYear() + 1, parsed.getMonth() + 1, 0).toISOString().slice(0, 10))
  })()

  const emailSubject = `OU Kosher - Contract Package for ${companyName} [App ${resolvedApplicationId ?? '-'}]`
  const emailBody = `Dear ${contact.name || 'Company Contact'},

Enclosed please find the kosher certification contract package for ${companyName}.

Package contents:
${packageItems.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Please review, sign where indicated, and return the signed agreement together with payment of the enclosed invoice.

Sincerely,
${rcName}
Rabbinic Coordinator`

  if (!open) return null

  const handleSendEmail = async () => {
    if (!resolvedApplicationId) {
      toast.error('Application id is required before sending the contract email.')
      return
    }

    setIsSendingEmail(true)
    try {
      const htmlEmail = buildHtmlEmailFromPlainText(emailBody, {
        title: emailSubject,
        preheader: `Contract package for ${companyName}`,
      })

      const payload: ApplicationMessagePayload = {
        ApplicationID: resolvedApplicationId,
        FromUser: username ?? undefined,
        ToUser: contact.email || contact.name || undefined,
        Subject: emailSubject,
        MessageText: htmlEmail.html,
        MessageTextPlain: htmlEmail.text,
        PlainText: htmlEmail.text,
        Text: htmlEmail.text,
        MessageType: 'Email',
        Priority: 'NORMAL',
        SentDate: new Date().toISOString(),
        TaskInstanceId: taskInstanceId ?? undefined,
      }

      await createApplicationMessage({
        payload,
        token: token ?? undefined,
      })

      setEmailSent(true)
      setShowEmailPreview(false)
      toast.success('Contract package email recorded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send contract email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleCompleteTask = async () => {
    if (!taskInstanceId) {
      toast.error('Task instance id not found')
      return
    }

    await confirmTaskMutation.mutateAsync({
      taskId: String(taskInstanceId),
      applicationId: resolvedApplicationId,
      token: token ?? undefined,
      username: username ?? undefined,
      result: 'completed',
      completionNotes: `Contract package completed via Contract Stage${invoicePaid ? ' with payment received' : ''}.`,
    })

    toast.success('Contract task completed')
    onClose()
  }

  const previewContent =
    previewTab === 'a' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Schedule A
            </div>
            <h4 className="mt-2 text-2xl font-semibold text-gray-900">Ingredients</h4>
            <p className="mt-2 text-sm text-gray-500">
              Pulled live from the application detail ingredient list for the contract preview.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <ClipboardList className="h-3.5 w-3.5" />
            {contractIngredients.length} Ingredient{contractIngredients.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Group - Certificate
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Approved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractIngredients.length > 0 ? (
                contractIngredients.map((ingredient, index) => {
                  const status = hasDisplayValue(ingredient.status) ? String(ingredient.status) : '-'
                  const certificate = hasDisplayValue(ingredient.certification)
                    ? String(ingredient.certification)
                    : '-'

                  return (
                    <tr
                      key={`${ingredient.ingredient ?? 'ingredient'}-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {ingredient.ingredient || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {certificate !== '-' ? (
                          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            {certificate}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {status !== '-' ? (
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            {status}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-sm font-medium">No ingredients found</p>
                      <p className="mt-1 text-xs">
                        No application-detail ingredients are available for this contract preview.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : previewTab === 'b' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Schedule B
            </div>
            <h4 className="mt-2 text-2xl font-semibold text-gray-900">Products</h4>
            <p className="mt-2 text-sm text-gray-500">
              Pulled live from the application detail product list for the contract preview.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <ClipboardList className="h-3.5 w-3.5" />
            {contractProducts.length} Product{contractProducts.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Label #
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Label Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Brand
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Label Company
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Designation
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  C/I
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Bulk
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Symbol
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractProducts.length > 0 ? (
                contractProducts.map((product, index) => {
                  const designation = hasDisplayValue(product.ConsumerIndustrial)
                    ? String(product.ConsumerIndustrial)
                    : '-'
                  const labelNumber = hasDisplayValue(product.labelNo)
                    ? String(product.labelNo)
                    : '-'
                  const status = hasDisplayValue(product.status) ? String(product.status) : '-'

                  return (
                    <tr key={`${product.labelName ?? 'product'}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{labelNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {product.labelName || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{product.brandName || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{product.labelCompany || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="text-gray-400">-</span>
                      </td>
                      <td className="px-4 py-3">
                        {designation !== '-' ? (
                          <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {designation}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {toYesNoValue(product.bulkShipped)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {hasDisplayValue(product.certification) ? (
                          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            {product.certification}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {status !== '-' ? (
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            {status}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-sm font-medium">No products found</p>
                      <p className="mt-1 text-xs">No application-detail products are available for this contract preview.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : previewTab === 'cover' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {packageGenerated ? (
          <div className="font-sans">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-green-700">
                Package generated - {coverSeparateAttachments.length + 1} attachment
                {coverSeparateAttachments.length === 0 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPackageGenerated(false)
                  setEmailSent(false)
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Re-generate
              </button>
            </div>

            {emailSent ? (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-[12.5px] font-bold text-green-700">
                Sent via Outlook to {contact.email || contact.name || 'company contact'} - package
                logged to the application communications.
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[10px] border border-gray-200">
              <div className="flex gap-3 border-b border-gray-100 px-3.5 py-2 text-[12.5px]">
                <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                  From
                </span>
                <span>OU Kashruth Division - {rcName} &lt;{rcEmail}&gt;</span>
              </div>
              <div className="flex gap-3 border-b border-gray-100 px-3.5 py-2 text-[12.5px]">
                <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                  To
                </span>
                <span>
                  {contact.name || 'Company Contact'}
                  {contact.email ? ` <${contact.email}>` : ''}
                </span>
              </div>
              <div className="flex gap-3 border-b border-gray-100 px-3.5 py-2 text-[12.5px]">
                <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                  Cc
                </span>
                <span>{rcName} &lt;{rcEmail}&gt;</span>
              </div>
              <div className="flex gap-3 border-b border-gray-100 px-3.5 py-2 text-[12.5px]">
                <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                  Subject
                </span>
                <span>
                  <strong>Kosher Certification Contract - {companyName}</strong>
                </span>
              </div>
              <div className="px-3.5 py-3.5">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Cover letter - editable (email body)
                </div>
                <textarea
                  readOnly
                  value={emailBody}
                  className="min-h-[172px] w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12.5px] leading-6 text-[#1e1e2e]"
                />
              </div>
              <div className="border-t border-gray-100 bg-gray-50 px-3.5 py-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Attachments - {coverSeparateAttachments.length + 1}
                </div>
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12.5px]">
                  <FileText className="h-4 w-4 text-[#185087]" />
                  <span className="font-semibold text-[#1e1e2e]">
                    Certification_Package_{companyName.replace(/[^A-Za-z0-9]+/g, '_')}.pdf
                  </span>
                  <span className="ml-auto text-[11px] text-gray-400">
                    Agreement + Schedules A-E - {coverPackageItems.length} documents
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('agreement')}
                    className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11.5px] font-semibold text-[#185087]"
                  >
                    View
                  </button>
                </div>
                {coverSeparateAttachments.map((attachment) => (
                  <div
                    key={attachment.file}
                    className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12.5px] last:mb-0"
                  >
                    <FileText className="h-4 w-4 text-[#185087]" />
                    <span className="font-semibold text-[#1e1e2e]">{attachment.file}</span>
                    <span className="ml-auto text-[11px] text-gray-400">{attachment.desc}</span>
                    <button
                      type="button"
                      onClick={() => setPreviewTab(attachment.tab)}
                      className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11.5px] font-semibold text-[#185087]"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {!emailSent ? (
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={handleSendEmail}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#185087] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#13406c] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Send className="h-4 w-4" />
                  {isSendingEmail ? 'Sending...' : 'Send via Outlook'}
                </button>
              ) : null}
              <p className="text-[11px] text-gray-400">
                The cover letter is the email body - edit it above. The schedules are one PDF; the
                invoice and any PLA are separate attachments. Click View on any to review it before
                sending.
              </p>
            </div>
          </div>
        ) : (
          <div className="font-sans">
            <div className="mb-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setPackageGenerated(true)
                  toast.success('Contract package generated')
                }}
                className="inline-flex items-center gap-2 rounded-md bg-[#185087] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#13406c]"
              >
                <FileText className="h-4 w-4" />
                Generate Contract Package
              </button>
            </div>
            <div className="mb-4 flex items-start justify-between border-b-2 border-[#185087] pb-3">
              <div>
                <div className="font-serif text-lg font-bold tracking-tight text-[#185087]">
                  ORTHODOX UNION
                </div>
                <div className="mt-0.5 text-[10.5px] text-gray-500">
                  Kashruth Division - 40 Rector Street, 4th Floor, New York, NY 10006
                </div>
              </div>
              <div className="text-right text-[11px] text-gray-500">
                {formatFullDate(effectiveDate)}
                <br />
                Re: Kosher Certification Contract
              </div>
            </div>

            <p className="mb-3 text-[12.5px] leading-6 text-gray-600">
              The contract schedules are combined into <strong>one PDF</strong>. The certification
              invoice and any PLA{hasPrivateLabelAgreements && privateLabelGroups.length > 1 ? 's' : ''}{' '}
              go out as <strong>separate attachments</strong>. Click{' '}
              <strong>Generate Contract Package</strong> to build them, then review and edit the cover
              letter before sending.
            </p>

            <div className="mb-2 mt-4 flex items-baseline justify-between text-[10px] font-bold uppercase tracking-wide text-gray-400">
              <span>Contract Package - one PDF</span>
              <span className="font-semibold normal-case tracking-normal text-gray-600">
                {coverPackageItems.length} documents
              </span>
            </div>
            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
              {coverPackageItems.map((item, index) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 border-b border-gray-100 px-3.5 py-2.5 last:border-b-0"
                >
                  <div className="mt-0.5 flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full bg-[#185087] text-[10.5px] font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-[#1e1e2e]">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-2 mt-4 flex items-baseline justify-between text-[10px] font-bold uppercase tracking-wide text-gray-400">
              <span>Separate Attachments</span>
              <span className="font-semibold normal-case tracking-normal text-gray-600">
                {coverSeparateAttachments.length}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              {coverSeparateAttachments.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 border-b border-gray-100 px-3.5 py-2.5 last:border-b-0"
                >
                  <div className="mt-0.5 flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10.5px] font-bold text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-[#1e1e2e]">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ) : previewTab === '__old_cover' ? (
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        <div className="border-b border-gray-200 pb-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            Contract Package
          </div>
          <h4 className="mt-2 text-2xl font-semibold text-gray-900">{companyName}</h4>
          <p className="mt-2 text-sm text-gray-600">
            Plant: {plantLabel} · App #{resolvedApplicationId ?? '-'}
          </p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          Enclosed please find the kosher certification contract package for review and signature.
        </div>
        <div className="space-y-3">
          {packageItems.map((item, index) => (
            <div key={item} className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                {index + 1}
              </div>
              <div>
                <div className="font-medium text-gray-900">{item}</div>
                <div className="text-sm text-gray-500">
                  {item === 'Certification Invoice'
                    ? `Annual fee ${formatCurrency(annualFee)}`
                    : 'Prepared as part of the contract package'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : previewTab === 'agreement' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6 font-serif text-[14px] leading-7 text-slate-800">
        <h4 className="mb-4 text-center text-[15px] font-bold tracking-wide">AGREEMENT</h4>
        <p className="mb-3">
          <b>THIS AGREEMENT</b> (this "Agreement") is entered into as of{' '}
          <MergeField token="effective_date" value={`the first day of ${formatMonthDay(effectiveDate)}`} />{' '}
          ("Effective Date"), by and between the{' '}
          <b>Union of Orthodox Jewish Congregations of America, Kashruth Division</b> (the "OU"),
          and <MergeField token="company_name" value={companyName} /> (the "Company").
        </p>
        <div className="my-4">
          {legalReviewNeeded ? (
            <div>
              <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                Agreement body &mdash; structured clauses &middot;{' '}
                {agreementClausesEditable ? 'editable (Legal engaged)' : 'read-only'}
              </div>
              {!isLatestClauseVersion ? (
                <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 font-sans text-xs font-semibold text-yellow-800">
                  Viewing{' '}
                  {clauseVersions.find((version) => version.n === activeClauseVersion)?.label ??
                    `v${activeClauseVersion}`}{' '}
                  - read-only. Switch to the latest version to edit.
                </div>
              ) : legalApproved ? (
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 font-sans text-xs font-semibold text-green-700">
                  Legal has signed off - clauses locked.
                </div>
              ) : null}

              <div className="space-y-1">
                {visibleAgreementClauses.map((clause) => {
                  const originalText =
                    originalAgreementClauses.find((original) => original.id === clause.id)?.text ?? ''
                  const changed = clause.text !== originalText
                  const editing = editingClauseId === clause.id

                  if (editing) {
                    return (
                      <div
                        key={clause.id}
                        className="rounded-lg border border-yellow-300 bg-yellow-50 p-3"
                      >
                        <div className="mb-2 font-bold">{clause.label}</div>
                        <textarea
                          rows={Math.max(3, Math.ceil(editingClauseText.length / 68))}
                          value={editingClauseText}
                          onChange={(event) => setEditingClauseText(event.target.value)}
                          className="w-full rounded-lg border border-blue-700 px-3 py-2 font-serif text-[13.5px] leading-7 text-slate-800 shadow-[0_0_0_3px_rgba(24,80,135,0.12)]"
                        />
                        <div className="mt-2 flex gap-2 font-sans">
                          <button
                            type="button"
                            onClick={() => saveClauseChange(clause.id)}
                            className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Save change
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClauseId(null)
                              setEditingClauseText('')
                            }}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={clause.id}
                      className={`group relative rounded-lg border p-3 ${
                        changed
                          ? 'border-yellow-300 bg-yellow-50'
                          : agreementClausesEditable
                            ? 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                            : 'border-transparent'
                      }`}
                    >
                      <div className="mb-1 font-bold">
                        {clause.label}
                        {changed ? (
                          <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 align-middle font-sans text-[9.5px] font-bold text-yellow-800">
                            revised
                          </span>
                        ) : null}
                      </div>
                      {showClauseChanges && changed ? (
                        <div className="space-y-1">
                          <p>
                            <span className="text-red-700 line-through decoration-red-500">
                              {originalText}
                            </span>
                          </p>
                          <p>
                            <span className="text-green-700 underline decoration-green-500">
                              {clause.text}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <p>{clause.text}</p>
                      )}
                      {agreementClausesEditable ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClauseId(clause.id)
                            setEditingClauseText(clause.text)
                          }}
                          className="absolute right-2 top-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-sans text-[11px] font-semibold text-blue-700 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              {clauseVersions.length > 1 ? (
                <div className="mt-5 border-t border-slate-200 pt-3 font-sans">
                  <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                    Version history
                  </div>
                  {clauseVersions
                    .slice()
                    .reverse()
                    .map((version) => (
                      <div
                        key={version.n}
                        className="flex gap-2 py-1 text-[11.5px] text-slate-600"
                      >
                        <b className="text-slate-900">{version.label}</b>
                        <span>{version.name}</span>
                        <span className="ml-auto text-slate-400">
                          {version.author} - {version.ts}
                        </span>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
              Standard agreement body - template text (static; not edited for a standard template)
            </div>
          )}
          {!legalReviewNeeded ? (
            <div className="space-y-3">
              {STANDARD_AGREEMENT_BODY.map((section) => (
                <div key={section.title}>
                  <p className="mb-1 mt-3 font-bold">{section.title}</p>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={`${section.title}-${index}`} className="mb-2">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-5 border-t border-slate-200 pt-4 text-[12.5px]">
          <p className="mb-4 italic">
            IN WITNESS WHEREOF, the Parties hereto have caused this Agreement to be executed as of
            the Effective Date.
          </p>
          <p className="mb-1">
            <b>"OU"</b>
          </p>
          <p className="mb-3 font-bold">
            UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA, KASHRUTH DIVISION
          </p>
          <div className="leading-relaxed text-slate-600">
            <p>
              By: <MergeField token="ou_rc" value={rcName} />
            </p>
            <p className="mb-3">Title: Rabbinic Coordinator</p>
            <p className="mt-2">Address: 40 Rector St, New York, NY 10004</p>
            <p>Phone Number: (212) 563-4000</p>
            <p>Facsimile Number: (212) 564-9058</p>
          </div>
          <p className="mb-2 mt-5">
            <b>
              <MergeField token="company_name" value={companyName} />
            </b>
          </p>
          <div className="leading-relaxed text-slate-600">
            <p>
              By: ______________________________{' '}
              <span className="font-sans text-[11px] text-slate-400">(signed at execution)</span>
            </p>
            <p>
              Name: <MergeField token="company_signer" value={contact.name} />
            </p>
            <p>
              Title:{' '}
              <MergeField token="company_signer_title" value={contact.title || 'Authorized Signer'} />
            </p>
            <p>
              Address:{' '}
              <MergeField token="company_address" value={companyAddress || 'Address on file'} />
            </p>
            <p>
              Phone Number: <MergeField token="company_phone" value={companyPhone || '-'} />
            </p>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-3 font-sans text-[12px] text-slate-500">
          Attached: Schedule A (Ingredients) - B (Products) - C (Plants & Fee) - D
          (Production Procedures) - E (Labeling Requirements)
          {hasPrivateLabelAgreements
            ? ` - ${privateLabelGroups.length} Private Label Agreement${
                privateLabelGroups.length > 1 ? 's' : ''
              }`
            : ''}
        </div>
      </div>
    ) : previewTab === '__old_agreement' ? (
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            Agreement Body
          </div>
          <h4 className="mt-2 text-2xl font-semibold text-gray-900">Certification Agreement</h4>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Effective {formatDate(effectiveDate)} between the Union of Orthodox Jewish Congregations
            of America and {companyName}, located at {companyAddress || 'the address on file'}.
          </p>
        </div>
        <div className="space-y-4 text-sm leading-6 text-gray-700">
          <div>
            <div className="font-semibold text-gray-900">1. Certification Scope</div>
            <p>
              Certification applies to the approved products and ingredients reflected in Schedules A
              and B and to the plant information reflected in Schedule C.
            </p>
          </div>
          <div>
            <div className="font-semibold text-gray-900">2. Production Procedures</div>
            <p>{noProductionProcedures ? 'No special procedures supplied.' : productionProcedures}</p>
          </div>
          <div>
            <div className="font-semibold text-gray-900">3. Fee & Term</div>
            <p>
              The annual certification fee is {formatCurrency(annualFee)} beginning on{' '}
              {formatDate(effectiveDate)} and continuing under the terms of the agreement.
            </p>
          </div>
          <div>
            <div className="font-semibold text-gray-900">4. Signatures</div>
            <p>
              OU Coordinator: {rcName}
              <br />
              Company Signer: {contact.name || 'To be confirmed'}
              {contact.title ? ` · ${contact.title}` : ''}
            </p>
          </div>
        </div>
      </div>
    ) : previewTab === 'c' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6 font-serif text-[13.5px] leading-relaxed text-slate-800">
        <h4 className="mb-3 font-bold text-slate-700">Schedule C - Plants</h4>
        <p className="mb-1">
          <MergeField token="plant_name" value={plantLabel} />
        </p>
        <p className="mb-3">
          <MergeField token="plant_address" value={plantAddress || companyAddress || 'Address on file'} />
        </p>
        <p>
          Company shall pay an annual certification fee of{' '}
          <MergeField token="annual_fee" value={formatCurrency(annualFee)} /> for this plant.
        </p>
      </div>
    ) : previewTab === 'd' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Schedule D
        </div>
        <h4 className="mt-2 text-2xl font-semibold text-gray-900">Production Procedures</h4>
        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          {noProductionProcedures ? 'None.' : productionProcedures}
        </div>
      </div>
    ) : previewTab === 'e' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6 font-sans text-[12.5px] text-slate-800">
        <h4 className="mb-1 font-serif text-[13.5px] font-bold text-slate-700">
          Schedule E - Labeling Requirements
        </h4>
        <p className="mb-3 text-[12px] text-slate-400">
          Standard OU trademark-placement template - inserted automatically, static.
        </p>
        <ol className="list-decimal space-y-1.5 pl-5">
          {LABELING_RULES.map((rule, index) => (
            <li key={`${index}-${rule}`} className="leading-5 text-slate-800">
              {rule}
            </li>
          ))}
        </ol>
      </div>
    ) : previewTab === 'pla' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {selectedPrivateLabelGroup ? (
          <div className="font-serif text-[14px] leading-7 text-slate-800">
            {privateLabelGroups.length > 1 ? (
              <div className="mb-3 flex flex-wrap gap-2 rounded-lg bg-amber-50 p-2 font-sans">
                {privateLabelGroups.map((group) => (
                  <button
                    key={group.labelCompany}
                    type="button"
                    onClick={() => setSelectedPlaCompany(group.labelCompany)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                      selectedPrivateLabelGroup.labelCompany === group.labelCompany
                        ? 'border-amber-800 bg-amber-800 text-white'
                        : 'border-amber-200 bg-white text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {group.labelCompany}
                  </button>
                ))}
              </div>
            ) : null}

            <h4 className="mb-1 text-center text-[15px] font-bold tracking-wide">
              PRIVATE LABEL AGREEMENT
            </h4>
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2 font-sans">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
                Awaiting co-signature
              </span>
              <span className="text-[10.5px] text-slate-400">
                $250 - bundled into this contract - prepared in Products
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPlaBodyOpen((current) => !current)}
              className="mb-3 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left font-sans text-[11px] font-bold uppercase tracking-wide text-amber-800"
            >
              {plaBodyOpen ? 'Agreement text - click to collapse' : 'Agreement text (static three-way form - click to expand)'}
            </button>

            {plaBodyOpen ? (
              <div className="mb-4 rounded-lg border border-slate-200 p-4">
                <p className="mb-2">
                  <b>THIS PRIVATE LABEL AGREEMENT</b> (this "Agreement") is entered into as of{' '}
                  <MergeField token="effective_date" value={formatFullDate(effectiveDate)} />{' '}
                  ("Effective Date"), by and between the{' '}
                  <b>Union of Orthodox Jewish Congregations of America</b>, a State of New York
                  nonprofit corporation (the "OU"), and{' '}
                  <MergeField token="company_name" value={companyName} />, located at{' '}
                  <MergeField token="company_address" value={companyAddress || 'Address on file'} />{' '}
                  (the "Company"), and{' '}
                  <MergeField token="distributor" value={selectedPrivateLabelGroup.labelCompany} />,
                  located at <MergeField token="distributor_address" value="Address on file" />{' '}
                  (the "Distributor").
                </p>
                <p className="mb-2">
                  <b>RECITALS:</b>
                </p>
                <p className="mb-2">
                  WHEREAS, the OU performs Kosher certification services throughout the world and is
                  the exclusive owner of the OU certification mark; and
                </p>
                <p className="mb-2">
                  WHEREAS, the Company and Distributor would like the Company to produce
                  Distributor's products and place an OU Symbol on certain Private Label Products;
                </p>
                <p className="mb-2">
                  NOW, THEREFORE, the parties agree that certified Private Label Products shall be
                  manufactured only at approved plants and only as listed on Schedule A.
                </p>
                <p className="mb-2">
                  <b>SECTION 1. Certification of Private Label Products.</b> The certification of
                  Private Label Products is contingent upon the Company and the OU having entered
                  into, and being subject to, the Certification Agreement.
                </p>
                <p className="mb-2">
                  <b>SECTION 2. Indemnification and Limitation of Liability.</b> The Distributor and
                  Company agree to indemnify and hold the OU harmless from claims arising out of the
                  Private Label Products.
                </p>
                <div className="mt-4 border-t border-slate-200 pt-3 text-[12.5px]">
                  <p className="mb-3 italic">
                    IN WITNESS WHEREOF, the Parties hereto have caused this Agreement to be
                    executed as of the Effective Date.
                  </p>
                  <p className="mb-1">
                    <b>"OU"</b> - UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA, KASHRUTH
                    DIVISION
                  </p>
                  <p className="mb-3 text-slate-600">
                    By: <MergeField token="ou_rc" value={rcName} /> - Rabbinic Coordinator
                  </p>
                  <p className="mb-1">
                    <b>"COMPANY"</b> - <MergeField token="company_name" value={companyName} />
                  </p>
                  <p className="mb-3 text-slate-600">
                    By: ______________________________ -{' '}
                    <MergeField token="company_signer" value={contact.name} />
                  </p>
                  <p className="mb-1">
                    <b>"DISTRIBUTOR"</b> -{' '}
                    <MergeField token="distributor" value={selectedPrivateLabelGroup.labelCompany} />
                  </p>
                  <p className="text-slate-600">By: ______________________________</p>
                </div>
              </div>
            ) : null}

            <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
              Schedule A
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap font-sans text-[11.5px]">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-[9.5px] uppercase tracking-wide text-slate-400">
                    <th className="py-1 pr-2 font-semibold">Product Name<br />(By Company Name)</th>
                    <th className="py-1 pr-2 font-semibold">Product Name<br />(By Distributor Name)</th>
                    <th className="py-1 pr-2 font-semibold">Group</th>
                    <th className="py-1 pr-2 font-semibold">Distributor<br />Brand Name</th>
                    <th className="py-1 font-semibold">Symbol/<br />Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPrivateLabelGroup.products.map((product, index) => (
                    <tr key={`${product.labelName ?? 'pl'}-${index}`} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2 font-medium">{product.labelName || '-'}</td>
                      <td className="py-1.5 pr-2">{product.labelName || '-'}</td>
                      <td className="py-1.5 pr-2 text-slate-600">{product.group || 'Group 1'}</td>
                      <td className="py-1.5 pr-2 text-slate-600">{product.brandName || '-'}</td>
                      <td className="py-1.5 text-slate-600">{product.certification || product.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-2 mt-5 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
              Location(s) of Plant or Manufacturing Site
            </div>
            <table className="w-full font-sans text-[11.5px]">
              <thead>
                <tr className="border-b border-slate-300 text-left text-[9.5px] uppercase tracking-wide text-slate-400">
                  <th className="py-1 font-semibold">Name</th>
                  <th className="py-1 font-semibold">Address</th>
                  <th className="py-1 font-semibold">USDA Code</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1.5 pr-2 font-medium">{companyName}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{plantAddress || 'Address on file'}</td>
                  <td className="py-1.5 text-slate-600">-</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 font-sans text-sm text-amber-900">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-amber-800">
                Private Label Invoice
              </div>
              <div className="mt-1">
                Initial Private Label - {selectedPrivateLabelGroup.labelCompany}: $250.00 USD
              </div>
              <div className="mt-1 text-xs text-amber-700">
                Created in Products/Kashrus - invoice ID Kashrus-generated - payment auto-detected.
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No private-label products on Schedule B - no PLA required.
          </div>
        )}
      </div>
    ) : previewTab === 'plInvoice' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {selectedPrivateLabelGroup ? (
          <div>
            {privateLabelGroups.length > 1 ? (
              <div className="mb-3 flex flex-wrap gap-2 rounded-lg bg-amber-50 p-2 font-sans">
                {privateLabelGroups.map((group) => (
                  <button
                    key={group.labelCompany}
                    type="button"
                    onClick={() => setSelectedPlaCompany(group.labelCompany)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                      selectedPrivateLabelGroup.labelCompany === group.labelCompany
                        ? 'border-amber-800 bg-amber-800 text-white'
                        : 'border-amber-200 bg-white text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {group.labelCompany}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
              Private Label Invoice{' '}
              <span className="font-medium normal-case text-slate-400">
                - one per PL company - parallel to the contract - not a gate
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[560px] rounded-md border border-gray-300 bg-white p-5 font-sans text-[11px] leading-normal text-[#1e1e2e]">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-sm bg-[#185087] p-1 text-center text-[6px] font-bold leading-tight text-white">
                    KOSHER CERTIFICATION SERVICE
                  </div>
                  <div className="flex-1">
                    <div className="font-serif text-[11.5px] font-semibold tracking-wide">
                      UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA
                    </div>
                    <div className="mt-0.5 text-[10px] text-gray-700">
                      FORTY RECTOR STREET, 4TH FLOOR / NEW YORK, NY 10006
                    </div>
                  </div>
                  <div className="font-serif text-2xl font-bold tracking-wide text-[#185087]">
                    INVOICE
                  </div>
                </div>

                <table className="mb-4 w-full border-collapse border border-gray-400">
                  <thead>
                    <tr>
                      {['Invoice Number', 'Invoice Date', 'Amount', 'Account Number'].map((label) => (
                        <th
                          key={label}
                          className="border-r border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold last:border-r-0"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[
                        selectedPrivateLabelInvoiceId,
                        invoiceDate,
                        '$250.00',
                        selectedPrivateLabelInvoiceAccount,
                      ].map((value) => (
                        <td
                          key={value}
                          className="border-r border-t border-gray-300 px-2 py-1 text-center text-[11px] font-bold last:border-r-0"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>

                <div className="mb-2 grid grid-cols-[1.1fr_1fr_1.05fr] items-start gap-3">
                  <div className="text-[10.5px] leading-normal">
                    <strong>{companyName}</strong>
                    <br />
                    {billingLines.map((line) => (
                      <span key={`pl-bill-${line}`}>
                        {line}
                        <br />
                      </span>
                    ))}
                    <div className="mt-1.5">Att: {contact.name || 'Company Contact'}</div>
                  </div>
                  <div className="pt-1 text-center text-[10px] font-semibold italic leading-normal text-[#185087]">
                    The Orthodox Union strongly urges all customers to pay by ACH, wire, or credit card
                    to avoid check fraud. It&apos;s safer and quicker.
                  </div>
                  <div className="border border-gray-400 text-[9.5px]">
                    <div className="border-b border-gray-400 bg-blue-100 px-2 py-0.5 font-bold text-blue-900">
                      Online Payments: oudirect.org
                    </div>
                    <div className="border-b border-gray-400 bg-blue-100 px-2 py-0.5 font-bold text-blue-900">
                      Wire/ACH Bank Info:
                    </div>
                    <div className="px-2 py-1 leading-normal">
                      <b className="inline-block w-[58px]">Bank:</b>IDB
                      <br />
                      <b className="inline-block w-[58px]">Account:</b>Orthodox Union
                      <br />
                      <b className="inline-block w-[58px]">Account #:</b>1353211
                      <br />
                      <b className="inline-block w-[58px]">ABA #:</b>026009768
                      <br />
                      <b className="inline-block w-[58px]">Swift #:</b>IDBYUS33
                    </div>
                  </div>
                </div>

                <div className="mb-4 text-center text-[9.5px] italic text-gray-700">
                  For wire transfers, please reference your account and invoice numbers on all
                  transactions.
                </div>

                <div className="mb-4 grid grid-cols-[1fr_1.5fr] items-start gap-3">
                  <div className="text-[10.5px] leading-normal">
                    {companyName}
                    <br />
                    {billingLines.map((line) => (
                      <span key={`pl-billto-${line}`}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </div>
                  <div className="border border-gray-400">
                    <div className="border-b border-gray-400 px-2 py-1 text-center text-[10px] font-bold">
                      For questions or comments, contact your Rabbinic Coordinator.
                    </div>
                    <div className="px-2 py-1 text-center text-[10px]">
                      {rcName} &nbsp;&nbsp; (212) 563-4000 &nbsp;&nbsp; {rcEmail}
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {['Invoice #', 'Invoice Date', 'Amount', 'Due Date', 'Account #'].map((label) => (
                            <th
                              key={label}
                              className="border-r border-t border-gray-300 px-1 py-1 text-center text-[8.5px] font-bold last:border-r-0"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {[
                            selectedPrivateLabelInvoiceId,
                            invoiceDate,
                            '$250.00',
                            '',
                            selectedPrivateLabelInvoiceAccount,
                          ].map((value, index) => (
                            <td
                              key={`${value}-${index}`}
                              className="border-r border-t border-gray-300 px-1 py-1 text-center text-[9.5px] font-bold last:border-r-0"
                            >
                              {value || '\u00a0'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <table className="mb-4 w-full border-collapse border border-gray-400">
                  <tbody>
                    <tr className="bg-[#d9d9d9] font-bold">
                      <td className="px-2 py-1 text-[10px]">DESCRIPTION</td>
                      <td className="px-2 py-1 text-right text-[10px]" colSpan={2}>
                        Amount
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1">
                        <strong>Initial Private Label</strong>
                      </td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold">
                        Fees
                      </td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold">
                        Expenses
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1"></td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                        $250.00
                      </td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                    </tr>
                    <tr className="bg-[#d9d9d9] font-bold">
                      <td className="px-2 py-1">Details</td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1">
                        <strong>Distributor(s):</strong>
                      </td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1">{selectedPrivateLabelGroup.labelCompany}</td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                        $250.00
                      </td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1 text-[10px] italic text-gray-700">
                        Invoice for period {formatFullDate(effectiveDate)} to {invoiceTermEnd}.
                      </td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                    </tr>
                    <tr className="border-t border-gray-400 bg-[#d9d9d9] text-[11px] font-bold">
                      <td className="px-2 py-1">Total Amount Due</td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                        $250.00 USD
                      </td>
                      <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-1 flex items-start justify-between gap-3 text-[9.5px]">
                  <div>
                    <span className="font-bold">UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA</span>
                    <br />
                    40 Rector St, 4th Floor, New York, NY 10006
                    <br />
                    (212) 563-4000 fax (212) 564-9058
                  </div>
                  <div>Payable in US Dollars</div>
                </div>
              </div>
            </div>

            <p className="mb-0 mt-2 font-sans text-[11px] text-slate-500">
              Created by Yudi (Products) in Kashrus and sent to the customer with the contract - a
              separate invoice per private-label company. PL payment isn&apos;t tracked in this workflow.
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-slate-500">
            No private-label products on Schedule B - no PL invoice.
          </p>
        )}
      </div>
    ) : (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
          Contract Invoice{' '}
          <span className="font-medium normal-case text-slate-400">
            - KCM - annual certification fee
          </span>
        </div>
        {!annualFee ? (
          <p className="mb-3 font-sans text-[11.5px] font-semibold text-amber-700">
            Draft - enter the Annual Certification Fee on Schedule C to populate the amount.
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <div className="min-w-[560px] rounded-md border border-gray-300 bg-white p-5 font-sans text-[11px] leading-normal text-[#1e1e2e]">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-sm bg-[#185087] p-1 text-center text-[6px] font-bold leading-tight text-white">
                KOSHER CERTIFICATION SERVICE
              </div>
              <div className="flex-1">
                <div className="font-serif text-[11.5px] font-semibold tracking-wide">
                  UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA
                </div>
                <div className="mt-0.5 text-[10px] text-gray-700">
                  FORTY RECTOR STREET, 4TH FLOOR / NEW YORK, NY 10006
                </div>
              </div>
              <div className="font-serif text-2xl font-bold tracking-wide text-[#185087]">
                INVOICE
              </div>
            </div>

            <table className="mb-4 w-full border-collapse border border-gray-400">
              <thead>
                <tr>
                  {['Invoice Number', 'Invoice Date', 'Amount', 'Account Number'].map((label) => (
                    <th
                      key={label}
                      className="border-r border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold last:border-r-0"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[invoiceNumber, invoiceDate, invoiceAmount, invoiceAccountNumber].map((value) => (
                    <td
                      key={value}
                      className="border-r border-t border-gray-300 px-2 py-1 text-center text-[11px] font-bold last:border-r-0"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            <div className="mb-2 grid grid-cols-[1.1fr_1fr_1.05fr] items-start gap-3">
              <div className="text-[10.5px] leading-normal">
                <strong>{companyName}</strong>
                <br />
                {billingLines.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
                <div className="mt-1.5">Att: {contact.name || 'Company Contact'}</div>
              </div>
              <div className="pt-1 text-center text-[10px] font-semibold italic leading-normal text-[#185087]">
                The Orthodox Union strongly urges all customers to pay by ACH, wire, or credit card
                to avoid check fraud. It&apos;s safer and quicker.
              </div>
              <div className="border border-gray-400 text-[9.5px]">
                <div className="border-b border-gray-400 bg-blue-100 px-2 py-0.5 font-bold text-blue-900">
                  Online Payments: oudirect.org
                </div>
                <div className="border-b border-gray-400 bg-blue-100 px-2 py-0.5 font-bold text-blue-900">
                  Wire/ACH Bank Info:
                </div>
                <div className="px-2 py-1 leading-normal">
                  <b className="inline-block w-[58px]">Bank:</b>IDB
                  <br />
                  <b className="inline-block w-[58px]">Account:</b>Orthodox Union
                  <br />
                  <b className="inline-block w-[58px]">Account #:</b>1353211
                  <br />
                  <b className="inline-block w-[58px]">ABA #:</b>026009768
                  <br />
                  <b className="inline-block w-[58px]">Swift #:</b>IDBYUS33
                </div>
              </div>
            </div>

            <div className="mb-4 text-center text-[9.5px] italic text-gray-700">
              For wire transfers, please reference your account and invoice numbers on all
              transactions.
            </div>

            <div className="mb-4 grid grid-cols-[1fr_1.5fr] items-start gap-3">
              <div className="text-[10.5px] leading-normal">
                {companyName}
                <br />
                {billingLines.map((line) => (
                  <span key={`bill-${line}`}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
              <div className="border border-gray-400">
                <div className="border-b border-gray-400 px-2 py-1 text-center text-[10px] font-bold">
                  For questions or comments, contact your Rabbinic Coordinator.
                </div>
                <div className="px-2 py-1 text-center text-[10px]">
                  {rcName} &nbsp;&nbsp; (212) 563-4000 &nbsp;&nbsp; {rcEmail}
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Invoice #', 'Invoice Date', 'Amount', 'Due Date', 'Account #'].map((label) => (
                        <th
                          key={label}
                          className="border-r border-t border-gray-300 px-1 py-1 text-center text-[8.5px] font-bold last:border-r-0"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[invoiceNumber, invoiceDate, invoiceAmount, '', invoiceAccountNumber].map(
                        (value, index) => (
                          <td
                            key={`${value}-${index}`}
                            className="border-r border-t border-gray-300 px-1 py-1 text-center text-[9.5px] font-bold last:border-r-0"
                          >
                            {value || '\u00a0'}
                          </td>
                        ),
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <table className="mb-4 w-full border-collapse border border-gray-400">
              <tbody>
                <tr className="bg-[#d9d9d9] font-bold">
                  <td className="px-2 py-1 text-[10px]">DESCRIPTION</td>
                  <td className="px-2 py-1 text-right text-[10px]" colSpan={2}>
                    Amount
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1">
                    <strong>Initial Certification Fee</strong>
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold">
                    Fees
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold">
                    Expenses
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1"></td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                    {invoiceAmount}
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                <tr className="bg-[#d9d9d9] font-bold">
                  <td className="px-2 py-1">Details</td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                <tr>
                  <td className="px-2 py-1">
                    <strong>Plant(s):</strong>
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                <tr>
                  <td className="px-2 py-1">{plantLabel}</td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                    {invoiceAmount}
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                <tr>
                  <td className="px-2 py-1 text-[10px] italic text-gray-700">
                    Annual Certification Fee for the term {invoiceTermStart} to {invoiceTermEnd}.
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                {includeInvoiceComment && certificationInvoiceComment.trim() ? (
                  <tr>
                    <td className="px-2 py-1">
                      <strong>Comment:</strong> {certificationInvoiceComment}
                    </td>
                    <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                    <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                  </tr>
                ) : null}
                <tr className="border-t border-gray-400 bg-[#d9d9d9] text-[11px] font-bold">
                  <td className="px-2 py-1">Total Amount Due</td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                    {invoiceTotal}
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
              </tbody>
            </table>

            <div className="mt-1 flex items-start justify-between gap-3 text-[9.5px]">
              <div>
                <span className="font-bold">UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA</span>
                <br />
                40 Rector St, 4th Floor, New York, NY 10006
                <br />
                (212) 563-4000 fax (212) 564-9058
              </div>
              <div>Payable in US Dollars</div>
            </div>
          </div>
        </div>

        {invoicePaid ? (
          <div className="mt-3 flex flex-wrap gap-2 font-sans">
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10.5px] font-bold text-green-700">
              Paid in full
            </span>
            <div className="w-full rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
              <b>{invoiceAmount} received via ACH</b>
              <span className="mt-0.5 block text-[11.5px]">Source: Kashrus - Posted by Accounting.</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2 font-sans">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10.5px] font-bold text-amber-800">
              Awaiting payment
            </span>
            <span className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-[10.5px] font-bold text-gray-400">
              Auto-updates from Kashrus
            </span>
          </div>
        )}

        <p className="mt-2 font-sans text-[11px] text-slate-500">
          Created in KCM/Kashrus - invoice ID Kashrus-generated - payment auto-detected. Comment
          is entered under the certification fee. Runs parallel to any PLA invoices.
        </p>
      </div>
    )

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/45" onClick={onClose}>
        <div
          className="fixed right-0 top-0 flex h-full w-full max-w-[98vw] flex-col overflow-hidden bg-[#f5f7fb] shadow-2xl xl:max-w-[92vw]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b bg-gray-950 px-6 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sky-300">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-[0.22em]">
                    Contract Stage
                  </span>
                </div>
                <h3 className="mt-2 truncate text-2xl font-semibold">{companyName}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-300">
                  {taskName ? <span className="rounded-full bg-white/10 px-2.5 py-1">{taskName}</span> : null}
                  <span className="rounded-full bg-white/10 px-2.5 py-1">App #{resolvedApplicationId ?? '-'}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">Plant: {plantLabel}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">RC: {rcName}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">NCRC: {ncrcName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-white"
                aria-label="Close contract stage drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="border-b bg-[#f3f4f6] px-6 py-4">
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-3">
              <div className="flex flex-wrap items-center gap-3">
                {contractProgressSteps.map((step, index) => (
                  <div
                    key={step.label}
                    className={`flex min-w-[150px] flex-1 items-center gap-2 text-[12.5px] ${
                      step.complete
                        ? 'text-green-600'
                        : step.current
                          ? 'font-bold text-[#185087]'
                          : 'text-gray-400'
                    }`}
                  >
                    <span
                      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        step.complete
                          ? 'bg-green-600 text-white'
                          : step.current
                            ? 'bg-[#185087] text-white shadow-[0_0_0_4px_rgba(24,80,135,0.15)]'
                            : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {step.complete ? '✓' : index + 1}
                    </span>
                    {step.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden px-6 py-5 xl:grid-cols-[440px_minmax(0,1fr)]">
            <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
              <Section title="Contract Type">
                <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-medium text-gray-500">Determined by the system</div>
                    <div className="mt-1 text-[13.5px] font-semibold leading-5 text-gray-900">{contractTypeLabel}</div>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">
                    Set
                  </span>
                </div>
                <p className="mt-2 text-[11.5px] leading-5 text-gray-500">
                  Set from the application - a workflow is either a new-company contract or a plant
                  addendum, never both.
                </p>
              </Section>

              <Section title="Create Invoice" count="invoice details">
                <div className="space-y-3.5">
                  <label className="block text-sm">
                    <span className="text-[12.5px] font-semibold text-gray-700">
                      Effective date <span className="text-red-600">*</span>
                    </span>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(event) => setEffectiveDate(event.target.value)}
                      className="mt-1 w-full rounded-[7px] border border-slate-300 bg-white px-3 py-2 text-sm text-[#1e1e2e] focus:border-[#185087] focus:outline-none focus:ring-4 focus:ring-blue-900/10"
                    />
                    <span className="mt-1 block text-[11.5px] leading-5 text-gray-500">
                      Defaults to the first of the current month - reads "the first day of{' '}
                      {formatMonthDay(effectiveDate)}." Backdating allowed.
                    </span>
                  </label>

                  {!isNewCompanyContract ? (
                    <label className="block text-sm">
                      <span className="text-[12.5px] font-semibold text-gray-700">
                        Company payment cycle
                      </span>
                      <div className="mt-1 w-full rounded-[7px] border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
                        {formatShortDate(companyPaymentCycleStart)} - {formatShortDate(companyPaymentCycleEnd)}
                      </div>
                      <span className="mt-1 block text-[11.5px] leading-5 text-gray-500">
                        Pulled from the company record - the new plant&apos;s invoice is prorated to
                        sync with this cycle.
                      </span>
                    </label>
                  ) : null}

                  <label className="block text-sm">
                    <span className="text-[12.5px] font-semibold text-gray-700">
                      Annual certification fee <span className="text-red-600">*</span>
                    </span>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="4,860.00"
                        value={annualFee}
                        onChange={(event) => setAnnualFee(event.target.value)}
                        className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-7 pr-3 text-sm text-[#1e1e2e] focus:border-[#185087] focus:outline-none focus:ring-4 focus:ring-blue-900/10"
                      />
                    </div>
                    <span className="mt-1 block text-[11.5px] leading-5 text-gray-500">
                      Goes to Schedule C, per plant. Current invoice amount:{' '}
                      <b>{formatCurrency(annualFee)}</b>.
                    </span>
                  </label>

                  <label className="block text-sm">
                    <span className="text-[12.5px] font-semibold text-gray-700">
                      Certification invoice comment
                    </span>
                    <textarea
                      rows={2}
                      value={certificationInvoiceComment}
                      placeholder="Comment for the certification invoice..."
                      onChange={(event) => setCertificationInvoiceComment(event.target.value)}
                      className="mt-1 w-full rounded-[7px] border border-slate-300 bg-white px-3 py-2 text-sm text-[#1e1e2e] focus:border-[#185087] focus:outline-none focus:ring-4 focus:ring-blue-900/10"
                    />
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={includeInvoiceComment}
                        onChange={(event) => setIncludeInvoiceComment(event.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                      />
                      Include on invoice
                    </label>
                    <span className="mt-1 block text-[11.5px] leading-5 text-gray-500">
                      {includeInvoiceComment
                        ? 'Included on the Invoice tab, in the Details section.'
                        : 'Kept internal - not included on the invoice.'}
                    </span>
                  </label>
                </div>
              </Section>

              <Section title="Schedule D - Production" count="production procedures">
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNoProductionProcedures(true)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                      noProductionProcedures
                        ? 'border-[#58942F] bg-[#58942F] text-white'
                        : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoProductionProcedures(false)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                      !noProductionProcedures
                        ? 'border-[#58942F] bg-[#58942F] text-white'
                        : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    Specify
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Dedicated line, kosherization, bulk-shipment notes..."
                  value={productionProcedures}
                  disabled={noProductionProcedures}
                  onChange={(event) => setProductionProcedures(event.target.value)}
                  className="w-full rounded-[7px] border border-slate-300 bg-white px-3 py-2 text-sm text-[#1e1e2e] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 focus:border-[#185087] focus:outline-none focus:ring-4 focus:ring-blue-900/10"
                />
                <p className="mt-1 text-[11.5px] leading-5 text-gray-500">
                  Usually "None." Pulls into Schedule D of the agreement.
                </p>
              </Section>

              <Section title="Agreement Revisions">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[13.5px] font-semibold text-[#1e1e2e]">
                        Boilerplate changed or legal input needed?
                      </div>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {legalReviewNeeded
                          ? 'Routes to Legal for sign-off before the RC is notified.'
                          : 'Standard template - no legal review required.'}
                      </p>
                    </div>
                    <TogglePillGroup value={legalReviewNeeded} onChange={setLegalReviewNeeded} />
                  </div>
                  {legalReviewNeeded ? (
                    <div
                      className={`mt-3 text-xs font-semibold ${
                        legalApproved ? 'text-green-700' : 'text-violet-700'
                      }`}
                    >
                      Legal: {legalApproved ? 'signed off' : 'awaiting sign-off'}
                    </div>
                  ) : null}
                </div>
                {legalReviewNeeded && !legalApproved ? (
                  <button
                    type="button"
                    disabled={!Boolean(annualFee)}
                    onClick={() => setLegalApproved(true)}
                    className="mt-3 w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Mark Legal Approved
                  </button>
                ) : null}
              </Section>

              <Section title="RC Assigned to Company" count="rabbinic coordinator">
                {isNewCompanyContract ? (
                  <>
                    <div className="text-sm">
                      <span className="text-[12.5px] font-semibold text-gray-700">
                        Select RC <span className="text-red-600">*</span>
                      </span>
                      {selectedRc ? (
                        <div className="mt-1 rounded-[7px] border border-blue-200 bg-blue-50 px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-blue-950">{selectedRc.name}</div>
                              {selectedRc.userName ? (
                                <div className="mt-1 text-xs text-blue-800">{selectedRc.userName}</div>
                              ) : null}
                              {selectedRc.email ? (
                                <div className="mt-1 text-xs text-blue-700">{selectedRc.email}</div>
                              ) : null}
                            </div>
                            {!packageGenerated ? (
                              <button
                                type="button"
                                onClick={() => setSelectedRcLookupKey('')}
                                className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                              >
                                Change
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                              value={rcSearch}
                              onChange={(event) => setRcSearch(event.target.value)}
                              placeholder="Search by name, username, or email..."
                              className="w-full rounded-[7px] border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-[#1e1e2e] focus:border-[#185087] focus:outline-none focus:ring-4 focus:ring-blue-900/10"
                            />
                          </div>
                          <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
                            {isRcLookupLoading ? (
                              <div className="rounded border border-gray-200 bg-white px-3 py-6 text-center text-sm text-gray-500">
                                Loading RC list...
                              </div>
                            ) : isRcLookupError ? (
                              <div className="rounded border border-red-200 bg-red-50 px-3 py-6 text-center text-sm text-red-700">
                                Unable to load RC list.
                              </div>
                            ) : filteredRcOptions.length === 0 ? (
                              <div className="rounded border border-gray-200 bg-white px-3 py-6 text-center text-sm text-gray-500">
                                No RC matches found.
                              </div>
                            ) : (
                              filteredRcOptions.map((option) => (
                                <button
                                  key={option.lookupKey}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRcLookupKey(option.lookupKey)
                                    setRcSearch('')
                                  }}
                                  className="w-full rounded border border-gray-200 bg-white p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                                >
                                  <div className="font-medium text-gray-900">{option.name}</div>
                                  <div className="mt-1 text-xs text-gray-500">
                                    {[option.userName, option.email].filter(Boolean).join(' - ') || '-'}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-[7px] border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
                      {rcName}
                    </div>
                    <div className="mt-2 rounded-[7px] border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
                      {rcEmail}
                    </div>
                  </>
                )}
                <p className="mt-1 text-[11.5px] leading-5 text-gray-500">
                  {isNewCompanyContract
                    ? 'New company - select the RC from Kashrus. Prints on the agreement, invoice, and email.'
                    : 'Existing company - RC derived from Kashrus. Prints on the agreement, invoice, and email.'}
                </p>
                <div className="mt-3 border-t border-gray-100 pt-3">
                  {packageGenerated ? (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-[12.5px] font-semibold text-green-700">
                        RC notified for approval - sent as a live link to review.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPackageGenerated(false)
                          setContractSigned(false)
                          setInvoicePaid(false)
                          setEmailSent(false)
                        }}
                        className="w-full rounded-[7px] border border-gray-300 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Re-open for edits
                      </button>
                    </div>
                  ) : legalReviewNeeded && !legalApproved ? (
                    <>
                      <p className="mb-2 text-[12.5px] font-semibold text-violet-700">
                        Finish Legal sign-off before notifying the RC.
                      </p>
                      <button type="button" disabled className="w-full rounded-lg bg-gray-300 px-4 py-2.5 text-sm font-bold text-white">
                        Notify RC for approval
                      </button>
                    </>
                  ) : !readyToGenerate ? (
                    <>
                      <p className="mb-2 text-[12.5px] font-semibold text-amber-700">
                        {isNewCompanyContract && !selectedRc
                          ? 'Select the RC assigned to the company to continue.'
                          : 'Enter the annual certification fee to continue.'}
                      </p>
                      <button type="button" disabled className="w-full rounded-lg bg-gray-300 px-4 py-2.5 text-sm font-bold text-white">
                        Notify RC for approval
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPackageGenerated(true)
                        setPreviewTab('cover')
                        toast.success('RC notified for approval')
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#58942F] px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700"
                    >
                      <FileText className="h-4 w-4" />
                      Notify RC for approval
                    </button>
                  )}
                </div>
              </Section>

              {packageGenerated ? (
                <Section title="Completion">
                  <div className="space-y-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[13.5px] font-semibold text-[#1e1e2e]">
                            Signed contract received?
                          </div>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            Signed contract is required before advancing to Certification.
                          </p>
                        </div>
                        <TogglePillGroup value={contractSigned} onChange={setContractSigned} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[13.5px] font-semibold text-[#1e1e2e]">
                            Await payment before advancing?
                          </div>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            New company - signed contract and paid invoice both required.
                          </p>
                        </div>
                        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                          <span className="rounded-md bg-[#58942F] px-3 py-1.5 text-sm font-medium text-white">
                            Yes
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[13.5px] font-semibold text-[#1e1e2e]">
                            Contract invoice paid
                          </div>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            Payment status mirrors the Kashrus invoice state.
                          </p>
                        </div>
                        <TogglePillGroup value={invoicePaid} onChange={setInvoicePaid} />
                      </div>
                    </div>
                    {emailSent ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                        Contract package email recorded successfully.
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!readyToAdvance || confirmTaskMutation.isPending}
                      onClick={handleCompleteTask}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                      {confirmTaskMutation.isPending ? 'Completing...' : 'Move to Certification Stage'}
                    </button>
                  </div>
                </Section>
              ) : null}

            </div>
            <div className="flex min-h-0 flex-col overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-sm xl:sticky xl:top-5">
              <div className="shrink-0 border-b-2 border-slate-200 bg-white px-4 py-3.5">
                <div className="mb-2.5 flex flex-wrap items-center justify-end gap-3">
                  {legalReviewNeeded && previewTab === 'agreement' ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                        <input
                          type="checkbox"
                          checked={showClauseChanges}
                          onChange={(event) => setShowClauseChanges(event.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300"
                        />
                        Show changes
                      </label>
                      <select
                        value={activeClauseVersion}
                        onChange={(event) => {
                          setActiveClauseVersion(Number(event.target.value))
                          setEditingClauseId(null)
                          setEditingClauseText('')
                        }}
                        title="Version"
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        {clauseVersions.map((version) => (
                          <option key={version.n} value={version.n}>
                            {version.label} - {version.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                    <input
                      type="checkbox"
                      checked={showMergeFieldsHint}
                      onChange={(event) => setShowMergeFieldsHint(event.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                    Show merge fields
                  </label>
                </div>
                <div className="flex flex-wrap gap-1 rounded-[9px] bg-[#eef1f5] p-1">
                    {[
                      ['cover', 'Cover'],
                      ['agreement', 'Agreement'],
                      ['a', 'A · Ingredients'],
                      ['b', 'B · Products'],
                      ['c', 'C · Plants'],
                      ['d', 'D · Procedures'],
                      ['e', 'E · Labeling'],
                      ['invoice', 'Invoice'],
                      ['pla', 'PLA'],
                      ['plInvoice', 'PL Invoice'],
                    ].map(([value]) => {
                      const tab = value as PreviewTab
                      if ((tab === 'pla' || tab === 'plInvoice') && !hasPrivateLabelAgreements) return null

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPreviewTab(tab)}
                          style={{ order: getPreviewTabOrder(tab) }}
                          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            previewTab === value
                              ? 'border-[#185087] bg-[#185087] text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {getPreviewTabLabel(tab)}
                        </button>
                      )
                    })}
                  </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f7f8fb] p-5 font-serif text-[13.5px] leading-relaxed">
                {previewContent}
              </div>
              <p className="shrink-0 px-4 pb-3 pt-2 text-[11px] text-slate-400">
                Yellow = auto-merged from records / your entries / live tables.
                {showMergeFieldsHint ? ' Hover highlighted values to see the merge token.' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showEmailPreview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Contract Email Preview</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Review the contract package email before recording it on the application.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(false)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Close contract email preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg border border-gray-200">
                <div className="grid grid-cols-[80px_1fr] border-b px-3 py-2 text-sm">
                  <span className="font-medium text-gray-500">To</span>
                  <span>{contact.email || contact.name || '-'}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] border-b px-3 py-2 text-sm">
                  <span className="font-medium text-gray-500">Subject</span>
                  <span>{emailSubject}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] px-3 py-2 text-sm">
                  <span className="font-medium text-gray-500">Attach</span>
                  <span>{packageItems.length} contract documents</span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                {emailBody.split('\n').map((line, index) =>
                  line ? (
                    <p key={`${line}-${index}`} className={index === 0 ? undefined : 'mt-3'}>
                      {line}
                    </p>
                  ) : null,
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
              <button
                type="button"
                onClick={() => setShowEmailPreview(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={handleSendEmail}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Send className="h-4 w-4" />
                {isSendingEmail ? 'Sending...' : 'Record Email'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
