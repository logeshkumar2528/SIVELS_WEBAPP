import { useAuthedObjectUrl } from './useAuthedObjectUrl';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** Drop-in <img> for API-served images that require the Bearer token. */
export default function AuthImage({ src, alt = '', ...props }) {
  const resolvedSrc = useAuthedObjectUrl(src);
  return <img {...props} alt={alt} src={resolvedSrc ?? (src ? TRANSPARENT_PIXEL : src)} />;
}
