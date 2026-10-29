import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

let MediaLibrary: typeof import('expo-media-library') | null = null;
try {
  MediaLibrary = require('expo-media-library');
} catch (e) {
  // Gracefully handled if native module is not linked in current binary
}

/**
 * Ensures the scoresheet is saved to local app storage (documentDirectory)
 * and returns the local file URI, base64 payload, and MIME type.
 */
export async function prepareLocalScoresheetFile(
  rawUrl: string,
  filenamePrefix = 'Scoresheet'
): Promise<{ localUri: string; base64Data: string; mimeType: string; fileName: string }> {
  const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40) || 'Scoresheet';
  let targetMime = 'image/jpeg';
  let ext = 'jpg';
  let base64Data = '';
  let localUri = '';

  if (rawUrl.startsWith('data:')) {
    const commaIndex = rawUrl.indexOf(',');
    const header = commaIndex !== -1 ? rawUrl.substring(0, commaIndex) : '';
    base64Data = commaIndex !== -1 ? rawUrl.substring(commaIndex + 1) : rawUrl;

    if (header.includes('png')) {
      ext = 'png';
      targetMime = 'image/png';
    } else if (header.includes('pdf')) {
      ext = 'pdf';
      targetMime = 'application/pdf';
    } else if (header.includes('webp')) {
      ext = 'webp';
      targetMime = 'image/webp';
    } else if (header.includes('csv')) {
      ext = 'csv';
      targetMime = 'text/csv';
    }

    const fileName = `${cleanPrefix}_${Date.now()}.${ext}`;
    const targetDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    localUri = `${targetDir}${fileName}`;

    await FileSystem.writeAsStringAsync(localUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { localUri, base64Data, mimeType: targetMime, fileName };
  }

  // HTTP/HTTPS or local path
  const rawExt = rawUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  ext = ['jpg', 'jpeg', 'png', 'pdf', 'csv', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  if (ext === 'pdf') targetMime = 'application/pdf';
  else if (ext === 'png') targetMime = 'image/png';
  else targetMime = 'image/jpeg';

  const fileName = `${cleanPrefix}_${Date.now()}.${ext}`;
  const targetDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  localUri = `${targetDir}${fileName}`;

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    const downloadResult = await FileSystem.downloadAsync(rawUrl, localUri);
    localUri = downloadResult.uri;
  }

  base64Data = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { localUri, base64Data, mimeType: targetMime, fileName };
}

/**
 * Downloads the scoresheet directly to device storage / Photos / Gallery
 * without triggering the external "Share with apps" dialog.
 */
export async function downloadScoresheetToDevice(
  rawUrl: string,
  filenamePrefix = 'Scoresheet'
): Promise<{ success: boolean; localUri?: string; error?: string }> {
  try {
    if (!rawUrl || typeof rawUrl !== 'string') {
      Alert.alert('Scoresheet', 'No scoresheet file or link is available to download.');
      return { success: false, error: 'Empty URL' };
    }

    const { localUri, base64Data, mimeType, fileName } = await prepareLocalScoresheetFile(
      rawUrl,
      filenamePrefix
    );

    // 1. If it's an image (JPG, PNG, WEBP), save directly to Photos / Gallery via MediaLibrary (if available)
    if (mimeType.startsWith('image/') && MediaLibrary) {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.createAssetAsync(localUri);

          Alert.alert(
            'Saved to Device Photos ✓',
            `The official scoresheet has been saved to your device Photos and Gallery!\n${fileName}`
          );
          return { success: true, localUri };
        }
      } catch (mediaErr) {
        console.warn('⚠️ [MediaLibrary] Could not save directly to photos:', mediaErr);
      }
    }

    // 2. On Android for non-images (PDF, CSV) or if MediaLibrary wasn't granted, try SAF
    if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
      try {
        let initialDir: string | undefined;
        try {
          initialDir = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
        } catch {}

        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialDir);
        if (permissions.granted) {
          const rawNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
          const createdSafUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            rawNameWithoutExt,
            mimeType
          );

          await FileSystem.StorageAccessFramework.writeAsStringAsync(createdSafUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          Alert.alert(
            'Download Complete ✓',
            `The official scoresheet has been saved to your selected folder on your device!`
          );
          return { success: true, localUri: createdSafUri };
        }
      } catch (safError: any) {
        console.warn('⚠️ [SAF Error] Falling back to document storage:', safError);
      }
    }

    // 3. Fallback: Saved permanently to local app storage
    Alert.alert(
      'Download Complete ✓',
      `Scoresheet successfully saved to your device:\n${fileName}`
    );
    return { success: true, localUri };
  } catch (err: any) {
    console.error('⚠️ [SCORESHEET DOWNLOAD] Error:', err);
    Alert.alert(
      'Download Notice',
      'Unable to save scoresheet to device: ' + (err?.message || 'Unknown error')
    );
    return { success: false, error: err?.message };
  }
}

/**
 * Explicitly opens the native system Share menu (Share with apps, Quick Share, Drive, etc.)
 */
export async function shareScoresheetFile(
  rawUrl: string,
  filenamePrefix = 'Scoresheet'
): Promise<{ success: boolean; localUri?: string; error?: string }> {
  try {
    if (!rawUrl || typeof rawUrl !== 'string') {
      Alert.alert('Scoresheet', 'No scoresheet file or link is available to share.');
      return { success: false, error: 'Empty URL' };
    }

    const { localUri, mimeType } = await prepareLocalScoresheetFile(rawUrl, filenamePrefix);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(localUri, {
        dialogTitle: `Share ${filenamePrefix}`,
        mimeType,
        UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.jpeg',
      });
      return { success: true, localUri };
    } else {
      Alert.alert('Sharing Unavailable', 'Native file sharing is not supported on this device.');
      return { success: false, error: 'Sharing unavailable' };
    }
  } catch (err: any) {
    console.error('⚠️ [SCORESHEET SHARE] Error:', err);
    Alert.alert('Share Error', err?.message || 'Failed to share scoresheet.');
    return { success: false, error: err?.message };
  }
}

/**
 * Backward compatibility alias
 */
export const downloadOrShareScoresheet = downloadScoresheetToDevice;
