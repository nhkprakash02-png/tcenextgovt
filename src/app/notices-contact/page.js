import React from 'react';
import Notices from '../../views/Notices';

export const metadata = {
  title: 'Notices & Contact | TCE - The Competitive Edge',
  description: 'Latest TCE notice board, institute address, faculty WhatsApp contacts and the admission inquiry form.',
  alternates: { canonical: '/notices-contact' },
};

export default function Page() {
  return <Notices />;
}
