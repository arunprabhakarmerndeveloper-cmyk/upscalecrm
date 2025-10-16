// src/app/components/Footer.tsx
export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="mt-8 bg-white border-t">
      <div className="container px-4 py-4 mx-auto text-center text-gray-500">
        <p>&copy; {currentYear} Upscael Water Solutions. All Rights Reserved.</p>
      </div>
    </footer>
  );
}