// Public Privacy Policy page compliant with India's Digital Personal Data Protection (DPDP) Act, 2023
import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  const grievanceOfficer = {
    name: 'Stellar Forge Grievance Cell',
    email: 'workwithstellarforge@gmail.com',
    role: 'Designated Grievance Redressal Officer (DPDP Act, 2023)',
    responseWindow: '30 calendar days',
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '36px 20px 80px', color: '#1e293b', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: 1.65 }}>
      <div style={{ marginBottom: 28, borderBottom: '1px solid #e2e8f0', paddingBottom: 20 }}>
        <Link to="/" style={{ color: '#00a88c', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          ← Back to Orders
        </Link>
        <h1 style={{ fontSize: '1.9rem', color: '#0f172a', margin: '14px 0 6px', fontWeight: 800 }}>
          Privacy Notice & Policy
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
          Compliance under the Digital Personal Data Protection Act, 2023 (DPDP Act) &bull; Last updated: October 2026
        </p>
      </div>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 10px' }}>
          1. Introduction & Data Fiduciary Role
        </h2>
        <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>
          This Order Management System (OMS) collects and processes personal data strictly for fulfilling laundry, dry cleaning, garment care services, and providing real-time order status tracking to customers. Under Section 2(i) of the Digital Personal Data Protection Act, 2023 (India), the operating laundry merchant operates as the <strong>Data Fiduciary</strong>, and the hosting SaaS platform acts as the <strong>Data Processor</strong> processing requests under the merchant's explicit instruction.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 10px' }}>
          2. Personal Data We Collect
        </h2>
        <p style={{ margin: '0 0 10px', color: '#334155', fontSize: '0.95rem' }}>
          In accordance with the principle of Data Minimization (Section 6), we only record data strictly necessary for order intake, execution, billing, and logistics:
        </p>
        <ul style={{ paddingLeft: 22, color: '#334155', fontSize: '0.95rem', margin: 0 }}>
          <li><strong>Contact Identifiers:</strong> Customer full name, phone/WhatsApp number, and optional email address.</li>
          <li><strong>Service & Fulfillment Data:</strong> Pickup/delivery address, garment counts, item weights (kg), pieces count, and service preferences.</li>
          <li><strong>Financial & Invoice Records:</strong> Bill numbers, tax invoice calculations (GST compliant), payment method status (Unpaid/Partly Paid/Paid). Note: Card or bank details are never stored on this platform.</li>
          <li><strong>Staff & Authentication:</strong> Merchant owner and staff business emails, authorized role assignments, and cryptographically hashed login tokens.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 10px' }}>
          3. Lawful Basis for Processing (Section 7 — Legitimate Uses)
        </h2>
        <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>
          Data is provided voluntarily by customers when requesting laundry services. Processing (including generating bills, sending WhatsApp/email status updates, and tracking links) is conducted on the lawful basis of specified service fulfillment under Section 7(a) of the DPDP Act 2023 and statutory GST/accounting obligations under Section 7(c). We do not perform any cross-platform user tracking, biometric profiling, or behavioural ad tracking.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 10px' }}>
          4. Sub-processors & Third-Party Service Providers
        </h2>
        <p style={{ margin: '0 0 10px', color: '#334155', fontSize: '0.95rem' }}>
          Your digital personal data is transmitted securely to verified infrastructure providers bound by confidentiality and data processing standards:
        </p>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', fontSize: '0.9rem', color: '#334155' }}>
          <p style={{ margin: '0 0 8px' }}><strong>• Supabase Inc.:</strong> Managed PostgreSQL database with Row-Level Security (RLS) and storage encryption at rest.</p>
          <p style={{ margin: '0 0 8px' }}><strong>• Brevo (Sendinblue SAS):</strong> Transactional email delivery for order receipts, tracking links, and auth verifications.</p>
          <p style={{ margin: 0 }}><strong>• Cloudflare, Inc.:</strong> Global edge network, DDoS protection, and secure serverless function runtime.</p>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 10px' }}>
          5. Data Retention & Erasure Schedule (2-Year Policy)
        </h2>
        <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>
          Personal customer information associated with completed orders is retained for an operational lifecycle of <strong>2 years (24 months)</strong> to comply with Indian commercial record-keeping, billing auditability, and dispute resolution. Following the expiration of 24 months, historical records are automatically anonymized, severing all phone numbers, email addresses, and personal identities from transaction analytics.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, margin: '0 0 10px' }}>
          6. Your Rights as a Data Principal
        </h2>
        <p style={{ margin: '0 0 10px', color: '#334155', fontSize: '0.95rem' }}>
          Under Chapter III of the DPDP Act, 2023, you are entitled to exercise the following rights regarding your digital personal data:
        </p>
        <ul style={{ paddingLeft: 22, color: '#334155', fontSize: '0.95rem', margin: '0 0 12px' }}>
          <li><strong>Right to Access & Summary (Sec 11):</strong> Request a structured extract of personal data stored about you.</li>
          <li><strong>Right to Correction & Updating (Sec 12):</strong> Rectify inaccurate contact numbers, addresses, or billing names.</li>
          <li><strong>Right to Erasure (Sec 12):</strong> Request complete purging or anonymization of your profile once services and payments are completed.</li>
          <li><strong>Right to Grievance Redressal (Sec 13):</strong> Register any concern directly with our Grievance Redressal Officer.</li>
        </ul>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
          To trigger an erasure or access request, speak with your laundry counter or email the Grievance Officer below with your registered mobile number.
        </p>
      </section>

      <section style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.15rem', color: '#166534', fontWeight: 700, margin: '0 0 8px' }}>
          7. Grievance Redressal Officer
        </h2>
        <p style={{ margin: '0 0 12px', color: '#14532d', fontSize: '0.9rem' }}>
          Pursuant to Section 8(10) of the Digital Personal Data Protection Act, 2023, the designated contact for data protection inquiries, access requests, and complaints is:
        </p>
        <div style={{ fontSize: '0.92rem', color: '#0f172a' }}>
          <div><strong>Designation / Officer:</strong> {grievanceOfficer.name}</div>
          <div style={{ marginTop: 4 }}>
            <strong>Official Email:</strong>{' '}
            <a href={`mailto:${grievanceOfficer.email}`} style={{ color: '#00a88c', fontWeight: 600 }}>
              {grievanceOfficer.email}
            </a>
          </div>
          <div style={{ marginTop: 4, color: '#475569', fontSize: '0.85rem' }}>
            Resolution commitment: Inquiries will be investigated and addressed within {grievanceOfficer.responseWindow}.
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center', paddingTop: 20, borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.8rem' }}>
        &copy; {new Date().getFullYear()} Laundry Order Management System &bull; Dedicated Hosting
      </div>
    </div>
  )
}
