// src/app/components/Footer.tsx
export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-white border-t mt-8">
      <div className="container mx-auto px-4 py-4 text-center text-gray-500">
        <p>&copy; {currentYear} AquaPure CRM. All Rights Reserved.</p>
      </div>
    </footer>
  );
}