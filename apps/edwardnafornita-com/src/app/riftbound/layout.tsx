import type { Metadata } from 'next';
import './riftbound.css';

export const metadata: Metadata = {
  title: 'Riftbound Collection | Edward Nafornita',
  description:
    'A private, searchable tracker for your Riftbound card collection.',
};

export default function RiftboundLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="riftbound-shell" suppressHydrationWarning>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{var t=localStorage.getItem('riftbound-theme');if(t==='light'||t==='dark')document.currentScript.parentElement.dataset.theme=t}catch(e){}",
        }}
      />
      {children}
    </div>
  );
}
