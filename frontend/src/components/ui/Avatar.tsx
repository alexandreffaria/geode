import { DEFAULT_GRADIENT_START, DEFAULT_GRADIENT_END } from "../../constants";

interface AvatarProps {
  name: string;
  gradientStart?: string;
  gradientEnd?: string;
  imageUrl?: string;
  size?: number; // px, default 36
  className?: string;
}

export function Avatar({
  name,
  gradientStart = DEFAULT_GRADIENT_START,
  gradientEnd = DEFAULT_GRADIENT_END,
  imageUrl,
  size = 36,
  className = "",
}: AvatarProps) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size * 0.4,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
    overflow: "hidden",
  };

  return (
    <div style={style} className={className}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
