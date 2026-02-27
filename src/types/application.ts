// Application-related types
export type ActionResult = "yes" | "no" | "pending" | "completed" | "in_progress";

export type PaginationMode = 'paged' | 'infinite';

export type StageLayout = 'horizontal' | 'mixed';

export type UserRole = {
  name: string;
}

export type ApplicantFile = {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: string; // e.g. "245 KB"
  fileType: "APP" | "ING" | "PROD" | "PDF" | "JPEG"; // restrict to known types
};
// Single application message
export type WFApplicationMessage = {
  id: number;
  fromUser: string;
  toUser: string;
  text: string;
  messageType: "USER" | "SYSTEM";
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW" | "MEDIUM";
  sentDate: string;
  isSystemMessage: boolean;
};
export type CompanyFromApplication = {
  companyName: string;
  companyAddress: string;
  companyAddress2?: string;
  companyCity: string;
  companyState?: string;
  companyCountry: string;
  companyPhone?: string;
  companyWebsite?: string;
  ZipPostalCode?: string;
  numberOfPlants?: number;
  whichCategory?: string;
  companyContacts?: CompanyFromApplicationContact[];
};

export type CompanyMatch = {
  Id: string | number;
  companyName: string;
  Address: string;
  City?: string;
  Country?: string;
  matchRating?: number;
  matchReason?: string;
};

export type KashrusAddress = {
  city?: string;
  country?: string;
  line2?: string;
  state?: string;
  street?: string;
  type?: string;
  zip?: string;
};

export type KashrusCompanyDetail = {
  companyName?: string;
  companyPhone?: string;
  companyState?: string;
  companyWebsite?: string;
  numberOfPlants?: number;
  whichCategory?: string;
  companyAddresses?: KashrusAddress[];
  companyContacts?: PlantFromApplicationContact[];
};

export type KashrusPlantDetail = {
  Address?: string;
  brieflySummarize?: string;
  plantID?: string | number;
  plantName?: string;
  plantNumber?: number;
  plantAddresses?: KashrusAddress[];
  plantContacts?: PlantFromApplicationContact[];
};

export type KashrusCompanyDetailsResponse = {
  data: KashrusCompanyDetail[];
};

export type KashrusPlantDetailsResponse = {
  data: KashrusPlantDetail[];
};

export type CompanySelected = {
  ID: string;
  companyName: string;
  Address: string;
  City?: string;
  Country?: string;
};

export type PlantFromApplication = {
  plantName: string;
  plantAddress: string;
  plantCity: string;
  plantState?: string;
  plantCountry: string;
  plantZip?: string;
  plantNumber?: number;
  plantPhone?: string;
  Address?: string;
  plantID?: string | number;
  brieflySummarize?: string;
  plantContacts?: PlantFromApplicationContact[];
};

export type PlantFromApplicationContact = {
  BillingCT?: string;
  Cell?: string;
  EMail?: string;
  Fax?: string;
  FirstName?: string;
  LastName?: string;
  PrimaryCT?: string;
  Title?: string;
  Voice?: string;
  WebCT?: string;
  companytitle?: string;
  owns_ID?: number;
  pcID?: number;
};

export type CompanyFromApplicationContact = PlantFromApplicationContact & {
  IsPrimaryContact?: boolean;
  billingContact?: string;
  billingContactEmail?: string;
  billingContactFirst?: string;
  billingContactLast?: string;
  billingContactPhone?: string;
  contactEmail?: string;
  contactEmail1?: string;
  contactFirst?: string;
  contactFirst1?: string;
  contactLast?: string;
  contactLast1?: string;
  contactPhone?: string;
  contactPhone1?: string;
  jobTitle1?: string;
};

export type PlantMatch = {
  PlantID: string | number;
  Id: string | number;
  plantName: string;
  Address: string;
  City?: string;
  Country?: string;
  OWNSID?: string;
  WFID?: string;
  matchRating?: number;
  matchReason?: string;
};

export type PlantSelected = {
  PlantID: string;
  plantName: string;
  Address: string;
  City?: string;
  Country?: string;
  OWNSID?: string;
  WFID?: string;
};

export type Task = {
  TaskInstanceId: number;
  name: string;
  PreScript: string;
  status: 'completed' | 'in_progress' | 'overdue' | 'blocked' | 'pending';
  assignee: string;
  daysActive: number;
  required: boolean;
  overdue: boolean;
  overdueDays?: number;
  CompletedDate?: string;
  PendingDate?: string;
  daysPending?: number;
  daysOverdue?: number;
  description: string;
  executedBy?: string;
  taskType?: string;
  capacity?: string;
  completedBy?: string;
  taskCategory?: string;
  taskRoles?: { taskRole: string }[],
  Result?: string;
  ResultData?: string;
  // Company-related fields (for ResolveCompany task)
  companyFromApplication?: CompanyFromApplication;
  companyMatchList?: CompanyMatch[];
  companySelected?: CompanySelected;
  
  // Plant-related fields (for ResolvePlant task)
  plantFromApplication?: PlantFromApplication;
  plantMatchList?: PlantMatch[];
  plantSelected?: PlantSelected;
};

export type Stage = {
  status: string;
  progress: number;
  tasks: Task[];
};
export type AssignedRole = Record<string, string>;

type ResolvedCompany = {
  companyName?: string
  Id?: string
  Address?: string,
  processBy?: string,
  ProcessDate?: string
}

type ResolvedPlant = {
  ownsID?: number
  WFID?: number
  plant?: {
    plantName?: string
    plantID?: string
    plantAddress?: string,
    processBy?: string,
    ProcessDate?: string
  }
}

export type ResolvedData = {
  company?: ResolvedCompany
  plants?: ResolvedPlant[]
}

export type Applicant = {
  id: number;
  applicationId: number;
  companyId?: number;
  company: string;
  plantId?: number;
  plant: string;
  region: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'MEDIUM';
  status: string; // e.g. 'contract_sent'
  assignedRC: string;
  assignedRoles?: AssignedRole[]; // 👈 Added this line
  daysInProcess: number;
  overdue: boolean;
  daysOverdue: number;
  lastUpdate: string;
  nextAction: string;
  documents: number;
  notes: number;
  stages: Record<string, Stage>;
  /** 👇 Matches API response */
  application_messages?: WFApplicationMessage[];
  /** If API sends extra stuff (like aiSuggestions), allow it */
  aiSuggestions?: Record<string, any>;
   /** 👇 New property for applicant files */
  files?: ApplicantFile[];
  createdDate?: string;
  resolved?: ResolvedData;
  externalReferenceId?: number; // for linking to detailed view, if needed
};

export interface Company {
  name: string;
  category?: string;
  currentlyCertified?: string;
  everCertified?: string;
  website?: string;
}

export interface Contact { type:string; name:string; phone?:string; email?:string; title?:string; designated?:boolean }

export interface Plant { id:number; plantId:string; name:string; address:any; contact:any; manufacturing:any; otherProducts?:boolean; otherProductsList?:string, otherPlantsProducing?:boolean, otherPlantsLocation?:string }

export interface UploadedFile { 
  fileId:number; 
  FileType:string; 
  FilePath:string; 
  UploadedDate:string; 
  tag?:string; 
  IsProcessed?:boolean; 
  RecordCount?:number; 
  description?:string;
  FileName?:string | undefined;
  FileSize?:string | undefined;
}

export interface QuoteItem {
  Description: string;
  Amount: string;
  itemId?: number;
}

export interface QuoteData {
  QuoteNumber: string;
  TotalAmount: string;
  validUntil: string;
  Status: 'pending_acceptance' | 'accepted' | 'rejected' | 'expired' | string;
  items: QuoteItem[];
  quoteId?: number;
}

export interface CompanyAddress {
  city: string;
  country: string;
  line2: string;
  state: string;
  street: string;
  type: string; // or "Billing" | "Physical"
  zip: string;
}

export interface CompanyContact {
  email: string;
  name: string;
  phone: string;
  role?: string; // optional because some don't have it
  type: string;  // or "Primary Contact" | "Not Primary Contact"
}
export interface PlantAddress {
  street: string
  line2?: string
  city: string
  state: string
  zip: string
  country?: string
  type: string // "Billing" | "Physical" ... (if you want, I can enum this)
}

export interface PlantContact {
  name: string
  email: string
  phone: string
  role?: string
  type: string // "Primary Contact" | "Not Primary Contact" etc.
}

export interface ApplicationDetail {
  applicationId: string;
  status: string;
  submissionDate?: string;
  kashrusCompanyId?: string;
  kashrusStatus?: string;
  primaryContact?: string;
  company: Company[];
  companyAddresses?: CompanyAddress[];   // <--- typed
  companyContacts?: CompanyContact[];    // <--- typed
  contacts: Contact[];
  plants: Plant[];
  plantAddresses?: PlantAddress[];
  plantContacts?: PlantContact[];
  products: any[];
  preferences?: any;
  files?: UploadedFile[];
  ingredients?: any[];
  quotes?: QuoteData[]; // <-- added here
  messages?: WFApplicationMessage[];
}

export interface ApplicationTask {
  TaskCategory: string;          // e.g., "CONFIRMATION"
  applicationId: number;
  id: number;
  assignee: string;              // e.g., "admin"
  assigneeRole: string;          // e.g., "LEGAL", "RFR", "PROD"
  companyId: number;
  companyName: string;
  completedDate: string | null;
  laneName: string;              // e.g., "NDA", "Inspection"
  plantId: number;
  plantName: string;
  processInstanceId: number;
  stageInstanceId: number;
  startedDate: string | null;
  status: "PENDING" | "COMPLETED" | string; // can extend as needed
  taskInstanceId: number;
  taskName: string;              // e.g., "Send NDA"
  taskDescription: string;       // e.g., "Send the NDA to the client"
  taskType: string;              // e.g., "CONFIRM"
  daysActive: number;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'MEDIUM';
  stageName: string;              // e.g., "Send NDA"
  daysPending: number;
  daysOverdue: number;
  completedCapacity?: string | null;
  completedBy?: string | null;
}

export interface ApplicationTasksResponse {
  data: ApplicationTask[];
  status: string; // e.g., "ok"
}

export interface ApplicationDetailResponse {
  applicationInfo: ApplicationDetail;
  appplicationinfo: ApplicationDetail;
}

export interface WFUserAttributes {
  CreatedDate: string;
  Email: string;
  FullName: string;
  IsActive: boolean;
  LastLoginDate: string | null;
  UserRole: string | null;
  UserName: string;
}

export interface WFUserRelationships {
  RoleAssigmentList: {
    data: any[];
    links: {
      self: string;
    };
  };
  WF_Role: {
    data: any | null;
    links: {
      self: string;
    };
  };
}

export interface WFUser {
  id: string;
  type: string;
  attributes: WFUserAttributes;
  relationships: WFUserRelationships;
  links: {
    self: string;
  };
}

export interface UserRoleResponse {
  data: WFUser[];
}

export interface UserRoleTokenResponse {
  access_token: string;
  message: string;
  token_type: string;
  valid: boolean;

  user_info: {
    cognito_sub: string;
    email: Record<string, never>; // because you showed: "email": {}
    user_id: string;

    roles: {
      role_name: string;
    }[];
  };
}

export interface ApplicantsResponse {
  data: Applicant[];
  meta: {
    async_enabled: boolean;
    count: number;
    limit: number;
    offset: number;
    processing_time: number;
    total_count: number;
  };
  status: 'ok' | 'error';
}

export type PrelimApplicantType = {
  // Top-level application fields
  submission_id: string;
  submission_date: string;
  JotFormId: number;
  formName: string;
  kashrusLink: string;
  status: string;
  language: string;
  
  // Company information
  companyName: string;
  companyAddress: string;
  companyAddress2?: string;
  companyCity: string;
  companyState: string;
  companyCountry: string;
  ZipPostalCode: string;
  companyPhone: string;
  companyWebsite?: string;
  
  // Primary contact
  IsPrimaryContact: boolean;
  contactFirst: string;
  contactLast: string;
  contactEmail: string;
  contactPhone: string;
  
  // Billing contact
  billingContact: string;
  billingContactFirst?: string;
  billingContactLast?: string;
  billingContactEmail?: string;
  billingContactPhone?: string;
  
  // Certification info
  OUcertified: boolean;
  everCertified: boolean;
  veganCert: boolean;
  whichCategory: string;
  whereDidHear: string;
  
  // Co-packing
  copack: string;
  listInCopack: boolean;
  areThere: boolean;
  
  // Plants
  numberOfPlants: number;
  plants: PlantPrelim[];
  
  // File links
  filelinks?: FileLink[];
};

export type PlantPrelim = {
  JotFormId: number;
  PlantId: number;
  plantNumber: number;
  plantName: string;
  plantAddress: string;
  plantCity: string;
  plantState: string;
  plantCountry: string;
  plantZip: string;
  majorCity?: string;
  
  // Plant contact
  contactFirst: string;
  contactLast: string;
  contactEmail: string;
  contactPhone: string;
  jobTitle: string;
  
  // Products & ingredients
  productDesc?: string;
  brieflySummarize: string;
  areAny: boolean;
  otherProducts: boolean;
  otherProductCompany?: string;
  
  products: Product[];
  ingredients: Ingredient[];
};

export type Product = {
  JotFormProductId: number;
  JotPlantId: number;
  productName: string;
  inHouse: boolean;
  privateLabel: boolean;
  privateLabelCo: string;
  Industrial: boolean;
  Retail: boolean;
};

export type Ingredient = {
  JotFormIngredientId: number;
  JotPlantId: number;
  ingredientLabelName: string;
  brandName: string;
  manufacturer: string;
  certifyingAgency: string;
  rawMaterialCode: string;
};

export type FileLink = {
  JotFormFileId: number;
  JotFormId: number;
};

export interface PrelimApplicantsResponse {
  data: PrelimApplicantType[];
  meta: {
    async_enabled: boolean;
    count: number;
    limit: number;
    offset: number;
    processing_time: number;
    total_count: number;
  };
  status: 'ok' | 'error';
}
