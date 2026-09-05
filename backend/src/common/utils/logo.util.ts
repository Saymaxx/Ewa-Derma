import * as fs from 'fs';
import * as path from 'path';

let cachedLogoBuffer: Buffer | null = null;

/**
 * Returns the Ewa Derma Clinic logo buffer if available on disk.
 */
export function getClinicLogoBuffer(): Buffer | null {
  if (cachedLogoBuffer) {
    return cachedLogoBuffer;
  }

  const potentialPaths = [
    path.join(process.cwd(), 'assets', 'logo.jpg'),
    path.join(process.cwd(), 'assets', 'ewa-derma-logo.jpg'),
    path.join(__dirname, '..', '..', '..', 'assets', 'logo.jpg'),
    path.join(process.cwd(), '..', 'frontend', 'public', 'logo.jpg'),
    path.join(process.cwd(), 'frontend', 'public', 'logo.jpg'),
  ];

  for (const p of potentialPaths) {
    try {
      if (fs.existsSync(p)) {
        cachedLogoBuffer = fs.readFileSync(p);
        return cachedLogoBuffer;
      }
    } catch {
      // Continue to next path
    }
  }

  return null;
}
