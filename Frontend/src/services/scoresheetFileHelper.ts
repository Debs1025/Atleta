import { Alert, Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Robust cross-platform helper to view, save, or download scoresheet files
 * supporting Base64 data URIs (data:image/...;base64,...), HTTP/HTTPS cloud URLs, and local files.
 */
export async function downloadOrShareScoresheet(
  rawUrl: string,
  filenamePrefix = 'Scoresheet'
): Promise<{ success: boolean; localUri?: string; error?: string }> {
  try {
    if (!rawUrl || typeof rawUrl !== 'string') {
      Alert.alert('Scoresheet', 'No scoresheet file or link is available.');
      return { success: false, error: 'Empty URL' };
    }

    const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40) || 'Scoresheet';
    let localUri = '';
    let targetMime = 'image/jpeg';

    if (rawUrl.startsWith('data:')) {
      // 1. Data URI extraction (Base64)
      const commaIndex = rawUrl.indexOf(',');
      const header = commaIndex !== -1 ? rawUrl.substring(0, commaIndex) : '';
      const base64Data = commaIndex !== -1 ? rawUrl.substring(commaIndex + 1) : rawUrl;

      let ext = 'jpg';
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
    } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      // 2. Remote URL download
      const ext = rawUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      const cleanExt = ['jpg', 'jpeg', 'png', 'pdf', 'csv', 'webp'].includes(ext) ? ext : 'jpg';
      if (cleanExt === 'pdf') targetMime = 'application/pdf';
      else if (cleanExt === 'png') targetMime = 'image/png';
      else targetMime = 'image/jpeg';

      const fileName = `${cleanPrefix}_${Date.now()}.${cleanExt}`;
      const targetDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
      localUri = `${targetDir}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(rawUrl, localUri);
      localUri = downloadResult.uri;
    } else {
      localUri = rawUrl;
    }

    // 3. Prompt user with native save / download / share options
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(localUri, {
        dialogTitle: `Download ${cleanPrefix}`,
        mimeType: targetMime,
        UTI: targetMime === 'application/pdf' ? 'com.adobe.pdf' : 'public.jpeg',
      });
      return { success: true, localUri };
    } else {
      Alert.alert(
        'Scoresheet Downloaded',
        `The scoresheet has been saved to your device:\n${localUri}`
      );
      return { success: true, localUri };
    }
  } catch (err: any) {
    console.warn('⚠️ [SCORESHEET DOWNLOAD] Error:', err);
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      Linking.openURL(rawUrl).catch(() => {});
    } else {
      Alert.alert(
        'Download Notice',
        'Unable to save scoresheet to device: ' + (err?.message || 'Unknown error')
      );
    }
    return { success: false, error: err?.message };
  }
}
