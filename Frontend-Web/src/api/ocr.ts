import { BASE_URL, getStoredToken, handleResponse } from './client';

export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const compressImageForOcr = (
  file: File,
  maxDimension = 1800,
  quality = 0.85
): Promise<{ base64Data: string; mimeType: string; dataUrl: string }> => {
  return new Promise((resolve) => {
    if (!file.type || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        resolve({
          base64Data: dataUrl.split(',')[1] || '',
          mimeType: file.type || 'image/jpeg',
          dataUrl,
        });
      };
      reader.onerror = () => resolve({ base64Data: '', mimeType: '', dataUrl: '' });
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            base64Data: compressedDataUrl.split(',')[1] || '',
            mimeType: 'image/jpeg',
            dataUrl: compressedDataUrl,
          });
          return;
        }
        const rawUrl = typeof e.target?.result === 'string' ? e.target.result : '';
        resolve({
          base64Data: rawUrl.split(',')[1] || '',
          mimeType: file.type || 'image/jpeg',
          dataUrl: rawUrl,
        });
      };
      img.onerror = () => {
        const rawUrl = typeof e.target?.result === 'string' ? e.target.result : '';
        resolve({
          base64Data: rawUrl.split(',')[1] || '',
          mimeType: file.type || 'image/jpeg',
          dataUrl: rawUrl,
        });
      };
      img.src = typeof e.target?.result === 'string' ? e.target.result : '';
    };
    reader.onerror = () => resolve({ base64Data: '', mimeType: '', dataUrl: '' });
    reader.readAsDataURL(file);
  });
};

/**
 * Single-file OCR scan routing directly to the backend OCR scanning engine
 * (aligned with mobile canonical endpoint: /matches/ocr/scan)
 */
export const scanScoresheetOCR = async (file: File): Promise<any> => {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('scoresheet', file);
  formData.append('document', file);

  const endpoints = [
    `${BASE_URL}/matches/ocr/scan`,
    `${BASE_URL}/matches/scan-scoresheet`,
    `${BASE_URL}/matches/web/scan-scoresheet`,
  ];

  let lastError: Error | null = null;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        return await handleResponse<any>(res);
      } else {
        const errTxt = await res.text().catch(() => '');
        lastError = new Error(`OCR scanner returned status ${res.status}: ${errTxt}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to connect to backend OCR scanner. Please make sure the backend server is running on port 5000.');
};

export const scanScoresheetStandalone = async (rawFile: File): Promise<any> => {
  return await scanScoresheetOCR(rawFile);
};

export const scanScoresheetClientDirect = async (
  rawFile: File,
  _homeTeam = 'Home Team',
  _awayTeam = 'Away Team',
  _sport = 'Basketball'
): Promise<any> => {
  return await scanScoresheetStandalone(rawFile);
};

/**
 * Multi-file scoresheet OCR scan routing directly to the backend multi-scoresheet engine
 * (aligned with mobile canonical endpoint: /matches/mobile/multi/scan-scoresheet)
 */
export const scanMultipleScoresheets = async (files: File[]): Promise<any> => {
  if (!files || files.length === 0) return null;
  if (files.length === 1) return scanScoresheetOCR(files[0]);

  const token = getStoredToken();
  const formData = new FormData();
  files.forEach((f) => {
    formData.append('files', f);
    formData.append('scoresheet', f);
  });

  const endpoints = [
    `${BASE_URL}/matches/mobile/multi/scan-scoresheet`,
    `${BASE_URL}/matches/multi/scan-scoresheet`,
    `${BASE_URL}/matches/web/multi/scan-scoresheet`,
  ];

  let lastError: Error | null = null;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        return await handleResponse<any>(res);
      } else {
        const errTxt = await res.text().catch(() => '');
        lastError = new Error(`Multi-scoresheet OCR scanner returned status ${res.status}: ${errTxt}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // Fallback: If dedicated multi-scan endpoint returns 404 on deployed backend,
  // scan each file individually via the active scanScoresheetOCR endpoint and combine
  try {
    const subMatches: any[] = [];
    for (const f of files) {
      const singleRes = await scanScoresheetOCR(f);
      if (singleRes) {
        subMatches.push(singleRes);
      }
    }
    if (subMatches.length > 0) {
      return {
        success: true,
        matches: subMatches,
        pages: subMatches,
        total_scoresheets_processed: subMatches.length,
      };
    }
  } catch (individualErr: any) {
    lastError = individualErr;
  }

  throw lastError || new Error('Failed to connect to backend multi-scoresheet scanner. Please verify network connectivity.');
};

export const uploadScoresheetFile = async (matchId: string, rawFile: File): Promise<any> => {
  const cleanId = matchId.replace(/^#/, '');
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('file', rawFile);
  formData.append('scoresheet', rawFile);

  const res = await fetch(`${BASE_URL}/matches/${cleanId}/scoresheet`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (res.ok) {
    return await handleResponse<any>(res);
  }

  return await scanScoresheetStandalone(rawFile);
};

export const uploadMultipleScoresheetFiles = async (matchId: string, files: File[]): Promise<any> => {
  if (!files || files.length === 0) return null;
  if (files.length === 1) return uploadScoresheetFile(matchId, files[0]);

  const cleanId = matchId.replace(/^#/, '');
  const token = getStoredToken();
  const formData = new FormData();
  files.forEach((f) => {
    formData.append('files', f);
    formData.append('scoresheet', f);
  });

  try {
    const res = await fetch(`${BASE_URL}/matches/${cleanId}/multi/scoresheet`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (res.ok) {
      return await handleResponse<any>(res);
    }
  } catch (err) {
    console.warn('Multi match scoresheet upload failed:', err);
  }

  return scanMultipleScoresheets(files);
};

export const submitVerifiedMatch = async (payload: any): Promise<any> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/matches/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<any>(res);
};
