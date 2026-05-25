import Image from "next/image";

interface HeaderProps {
  titulo?: string;
}

export default function Header({ titulo }: HeaderProps) {
  return (
    <header style={{
      background: "linear-gradient(135deg, #1B3A5C 0%, #2A6DA8 100%)",
      color: "white",
      padding: "0.75rem 1.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <Image
          src="/logo-kayard.png"
          alt="Kayard Transportes"
          width={180}
          height={50}
          style={{ objectFit: "contain" }}
          priority
        />
        {titulo && (
          <div style={{
            borderLeft: "1px solid rgba(255,255,255,0.3)",
            paddingLeft: "1rem",
            fontSize: 14,
            color: "rgba(255,255,255,0.85)"
          }}>
            {titulo}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <a href="/dashboard" style={{
          color: "rgba(255,255,255,0.85)",
          textDecoration: "none",
          fontSize: 13,
          padding: "0.4rem 0.75rem",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.3)"
        }}>
          Dashboard
        </a>
      </div>
    </header>
  );
}