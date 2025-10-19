import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { paramsToSign } = body;

    if (!paramsToSign) {
      return NextResponse.json({ error: "Missing parameters to sign." }, { status: 400 });
    }

    // --- ✅ NEW: Add the folder parameter to the signature ---
    // This ensures all uploads go into your 'quotations' folder.
    const folder = process.env.CLOUDINARY_FOLDER;
    if (folder) {
        // We need to ensure paramsToSign is an object before adding properties
        if (typeof paramsToSign !== 'object' || paramsToSign === null) {
            paramsToSign = {};
        }
        paramsToSign.folder = folder;
    }
    // --- END OF NEW ---

    // Generate the signature using your secret key.
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET as string);

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("Error generating signature:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ error: "Failed to generate signature.", details: errorMessage }, { status: 500 });
  }
}

