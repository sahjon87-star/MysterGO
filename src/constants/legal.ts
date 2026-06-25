import { Eye, FileText, Globe, Shield, Lock as LockIcon, Scale, UserCheck, CreditCard, CheckCircle2, AlertTriangle, Gavel, Gift } from 'lucide-react';

export const privacySections = [
  {
    title: '1. Information We Collect',
    icon: Eye,
    content: 'We collect information you provide directly to us when creating/modifying accounts, requesting services, or uploading KYC details.\n\n• Personal Identifiers: Full name, verified mobile phone number, email address, and profile picture.\n• Location Data: Precise real-time geographic coordinates via GPS (crucial for our 5km service radius, matching, and map rendering).\n• Financial Parameters: Selected mobile financial service (MFS) tokens (bKash/Nagad) used for payouts and secure transactional logs. (Note: We never collect or store your personal transaction PINs).'
  },
  {
    title: '2. How We Use Your Information',
    icon: FileText,
    content: 'We utilize collected insights to:\n\n• Provide, coordinate, and scale the MistriGO on-demand service marketplace.\n• Process dynamic bookings, trigger secure Start/Completion OTP sequences, and handle bKash/Nagad escrow payouts.\n• Track real-time location (including background location for verified Providers) to ensure accurate 5km spatial discovery and active tracking.\n• Distribute automated system alerts, SMS updates, and operational receipts.'
  },
  {
    title: '3. Data Sharing and Disclosure',
    icon: Globe,
    content: 'We respect user confidentiality and share information strictly under these explicit operational bounds:\n\n• Provider-Client Match: Core location coordinates and phone numbers are shared between the booked Customer and assigned Provider to enable service fulfillment.\n• Legal & Safety: Information may be disclosed if required by the law enforcement agencies under the prevailing Cyber Security frameworks of Bangladesh.\n• Global Public Reviews: Feedback, ratings, and operational comments submitted by clients are visible publicly on provider profiles.'
  },
  {
    title: '4. Your Choices & Data Rights',
    icon: Shield,
    content: '• Profile Modifications: You can adjust your profile parameters, picture, or preferences at any moment via the Settings Dashboard.\n• Permanent Account Deletion: Users can fully delete their account records at any time by requesting deletion directly via support@mistrigo.com.\n• Data Retention: Transaction histories and financial ledgers will be retained securely for statutory compliance and auditing as permitted by law.'
  },
  {
    title: '5. Data Security & Hosting',
    icon: LockIcon,
    content: 'We utilize industry-standard transit encryption and secure Firebase access configurations to prevent data leaks or unauthorized cross-origin breaches.'
  }
];

export const termsSections = [
  {
    title: '1. ACCEPTANCE OF TERMS',
    icon: Scale,
    content: 'By registering, accessing, or utilizing the MistriGO platform (app or website), you explicitly agree to be bound by these Terms of Service, our Privacy Policy, and all applicable digital safety regulations of the People\'s Republic of Bangladesh. If you do not agree to any clause outlined herein, you are strictly prohibited from using our services.'
  },
  {
    title: '2. USER ACCOUNTS & NID/KYC VERIFICATION',
    icon: UserCheck,
    content: 'To participate in our service marketplace as a Customer or a Service Provider (Mistri), you must maintain an active account with a verified Bangladeshi mobile number (+880). Service Providers are strictly required to submit authentic National Identification (NID) cards and valid KYC credentials. MistriGO reserves the right to freeze any profile holding unverified or forged NID records.'
  },
  {
    title: '3. PAYMENTS, ESCROW, AND CANCELLATION/REFUND POLICY',
    icon: CreditCard,
    content: '• MFS Settlement: All transactions are processed via secure Bangladeshi Mobile Financial Services (MFS) including bKash and Nagad.\n• Escrow & Completion OTP: Upon booking, funds are securely escrowed by the platform. The "Completion OTP" serves as the Customer’s absolute digital signature of work verification. Customers must NOT disclose this OTP to the Provider until the labor is completed satisfactorily. Once the Completion OTP is entered, funds are irreversibly transferred to the Provider\'s wallet.\n• Compliant Cancellation & Refund: In accordance with the Consumer Rights Protection Act 2009 of Bangladesh, if a booked Provider fails to show up or cancels the service before work begins, the escrowed amount will be fully credited back to the Customer’s MistriGO wallet or source MFS account within 3-5 working days.'
  },
  {
    title: '4. PAYMENT FRAUD & CUSTOMER NON-PAYMENT LIABILITY',
    icon: AlertTriangle,
    content: '• Admin Clearance Prerequisite: Providers agree that payouts are strictly contingent upon MistriGO (the Admin) successfully receiving and clearing the Customer\'s deposit via bKash/Nagad. If funds are withheld due to customer fraud, technical gateway failure, or illegal chargeback attempts, no payout will be issued by the Admin.\n• Theft of Service Recourse: If a Customer receives physical service from a Provider and subsequently attempts to withhold payment, manipulate the OTP sequence, or reverse the payment, it will be treated as theft of service. MistriGO will freeze the Customer\'s profile immediately and reserves the right to initiate civil or criminal proceedings against the offending individual under the prevailing laws of Bangladesh.'
  },
  {
    title: '5. INDEPENDENT CONTRACTOR STATUS & LIABILITY EXCLUSION',
    icon: CheckCircle2,
    content: 'Service Providers act strictly as independent contractors and NOT as employees, legal partners, or agents of MistriGO. In compliance with the Bangladesh Labour Act 2006, MistriGO bears zero liability for providing worker compensation, medical funds, or insurance. Providers are completely liable for their own operational tools, equipment, personal safety compliance, and the quality of physical work delivered on-site.'
  },
  {
    title: '6. ON-SITE CONDUCT, SAFETY, AND LAW ENFORCEMENT COOPERATION',
    icon: Shield,
    content: 'MistriGO acts exclusively as a digital platform matching supply and demand within a 5km spatial radius. MistriGO is not responsible for the personal conduct, behavior, or actions of any Customer or Provider during the execution of services. In the event of criminal activities, property damage, or theft on-site, MistriGO will strictly cooperate with the Bangladesh Police and law enforcement agencies by providing necessary NID records and log details, but the liability remains entirely on the offending party.'
  },
  {
    title: '7. REFERRAL PROGRAM & ANTI-EXPLOIT POLICY',
    icon: Gift,
    content: 'MistriGO provides growth rewards (such as our ৳30 promotional referral system) in absolute good faith for genuine user acquisition. Any attempt to exploit or farm this mechanism using virtual emulators, application duplicators, fake telephone numbers, or automated bots will result in the immediate and permanent termination of the user profile and the total forfeiture of all accumulated wallet credits.'
  },
  {
    title: '8. LIMITATION OF LIABILITY',
    icon: LockIcon,
    content: 'In no event shall MistriGO, its operators, or founders be legally or financially liable for any direct, indirect, on-site, or incidental damages—including physical injuries, property damage, arguments, or loss of profits—arising out of the use or inability to use the platform.'
  },
  {
    title: '9. GOVERNING LAW & JURISDICTION',
    icon: Gavel,
    content: 'These terms and conditions are strictly governed by and construed in accordance with the laws of the People\'s Republic of Bangladesh. All users irrevocably submit to the exclusive jurisdiction of the courts located in Dhaka, Bangladesh, for the resolution of any legal disputes.'
  }
];
