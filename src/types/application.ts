export interface Company {
  name: string;
  category?: string;
  currentlyCertified?: string;
  everCertified?: string;
  address: { street: string; line2?: string; city:string; state:string; country:string; zip:string };
  website?: string;
}

export interface Contact { type:string; name:string; phone?:string; email?:string; title?:string; designated?:boolean }

export interface Plant { id:number; plantId:string; name:string; address:any; contact:any; manufacturing:any; otherProducts?:boolean; otherProductsList?:string }

export interface UploadedFile { name:string; type:string; size:string; uploaded:string; tag?:string; processed?:boolean; recordCount?:number }

export interface ApplicationDetail {
  applicationId: string;
  status: string;
  submissionDate?: string;
  kashrusCompanyId?: string;
  kashrusStatus?: string;
  primaryContact?: string;
  company: Company;
  contacts: Contact[];
  plants: Plant[];
  products: any[];
  preferences?: any;
  uploadedFiles?: UploadedFile[];
  ingredients?: any[];
  // ...extend as needed
}
