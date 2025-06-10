import React, { useState } from "react";

// Direct imports from main app - adjust paths as needed
// You might need to add these to your docusaurus.config.ts webpack alias
// or copy the components you need

// Example of importing a stat card component
// import { StatCard } from '../../../src/components/stat-card';

// For now, let's create adapted versions that match your main app's style
interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  bgColor?: string;
  children: React.ReactNode;
  className?: string;
  modalContent?: React.ReactNode;
  modalTitle?: string;
  modalDescription?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  icon,
  bgColor,
  children,
  className = "",
  modalContent,
  modalTitle,
  modalDescription,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ensure proper contrast for both light and dark modes
  const defaultBgColor = "var(--ifm-color-emphasis-100)";
  const actualBgColor = bgColor || defaultBgColor;

  const HeaderContent = (
    <div
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {icon} {title}
      </div>
      {modalContent && (
        <span
          style={{ fontSize: "1rem", color: "var(--ifm-color-emphasis-600)" }}
        >
          →
        </span>
      )}
    </div>
  );

  const cardInnerContent = (
    <>
      <div
        style={{
          background: actualBgColor,
          width: "100%",
          padding: "1rem",
          transition: "all 0.2s ease",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: "0.875rem",
            fontWeight: "500",
            color: "var(--ifm-font-color-base)",
            textShadow: "none",
          }}
        >
          {HeaderContent}
        </h4>
      </div>
      <div style={{ width: "100%", flexGrow: 1, padding: "1rem" }}>
        {children}
      </div>
    </>
  );

  if (modalContent) {
    return (
      <>
        <button
          className={`card ${className}`}
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--ifm-color-emphasis-200)",
            borderRadius: "8px",
            background: "var(--ifm-card-background-color)",
            transition: "all 0.2s ease",
            cursor: "pointer",
            padding: 0,
            width: "100%",
            textAlign: "left",
          }}
          onClick={() => setIsModalOpen(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {cardInnerContent}
        </button>

        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="card"
              style={{
                maxWidth: "525px",
                width: "90%",
                maxHeight: "80vh",
                overflow: "auto",
                padding: 0,
                margin: "2rem",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--ifm-color-emphasis-200)",
                  padding: "1.5rem",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      marginBottom: modalDescription ? "0.5rem" : 0,
                    }}
                  >
                    {modalTitle || title}
                  </h2>
                  {modalDescription && (
                    <p
                      style={{
                        margin: 0,
                        color: "var(--ifm-color-emphasis-600)",
                      }}
                    >
                      {modalDescription}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "var(--ifm-color-emphasis-600)",
                  }}
                >
                  ×
                </button>
              </div>
              {modalContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={`card ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid var(--ifm-color-emphasis-200)",
        borderRadius: "8px",
        background: "var(--ifm-card-background-color)",
        transition: "all 0.2s ease",
        height: "100%",
      }}
    >
      {cardInnerContent}
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "success" | "warning" | "danger";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
}) => {
  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: "var(--ifm-color-secondary-dark)",
          color: "var(--ifm-font-color-base)",
          border: "1px solid var(--ifm-color-emphasis-300)",
        };
      case "success":
        return {
          backgroundColor: "#22c55e",
          color: "white",
        };
      case "warning":
        return {
          backgroundColor: "#f59e0b",
          color: "white",
        };
      case "danger":
        return {
          backgroundColor: "#ef4444",
          color: "white",
        };
      default:
        return {
          backgroundColor: "var(--ifm-color-primary)",
          color: "white",
        };
    }
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.25rem 0.6rem",
        borderRadius: "6px",
        fontSize: "0.75rem",
        fontWeight: "600",
        transition: "all 0.2s ease",
        ...getVariantStyles(variant),
      }}
    >
      {children}
    </span>
  );
};

interface SkillCardProps {
  tagName: string;
  score: number;
  level: number;
  progress: number;
  pointsToNext: number;
  rank?: number;
}

export const SkillCard: React.FC<SkillCardProps> = ({
  tagName,
  score,
  level,
  progress,
  pointsToNext,
  rank,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const name = tagName.toLowerCase();

  const getRankStyles = () => {
    if (!rank) return {};
    const styles = {
      1: {
        borderLeft: "4px solid #eab308",
        boxShadow: "0 0 0 1px rgba(234, 179, 8, 0.2)",
      },
      2: {
        borderLeft: "4px solid #a1a1aa",
        boxShadow: "0 0 0 1px rgba(161, 161, 170, 0.2)",
      },
      3: {
        borderLeft: "4px solid #a16207",
        boxShadow: "0 0 0 1px rgba(161, 98, 7, 0.2)",
      },
    };
    return styles[rank as keyof typeof styles] || {};
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        className="card"
        style={{
          position: "relative",
          cursor: "pointer",
          overflow: "hidden",
          transition: "all 0.2s ease",
          background: "var(--ifm-card-background-color)",
          ...getRankStyles(),
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            "var(--ifm-color-secondary-lighter)";
          setShowTooltip(true);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor =
            "var(--ifm-card-background-color)";
          setShowTooltip(false);
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem",
          }}
        >
          <div
            style={{
              width: "1.25rem",
              height: "1.25rem",
              flexShrink: 0,
              color: "var(--ifm-color-primary)",
              fontSize: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🎯
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <p
                style={{
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                  textTransform: "capitalize",
                }}
              >
                {name}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--ifm-color-emphasis-600)",
                  }}
                >
                  LVL
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                  }}
                >
                  {level}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTooltip && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            width: "16rem",
            padding: "0.75rem",
            backgroundColor: "var(--ifm-background-color)",
            border: "1px solid var(--ifm-color-emphasis-300)",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            marginTop: "0.5rem",
          }}
        >
          <div style={{ marginBottom: "0.75rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.375rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontWeight: "600",
                  textTransform: "capitalize",
                }}
              >
                {name}
              </p>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>Level {level}</p>
            </div>
            <div
              style={{
                height: "0.5rem",
                width: "100%",
                overflow: "hidden",
                borderRadius: "9999px",
                backgroundColor: "var(--ifm-color-emphasis-200)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  backgroundColor: "var(--ifm-color-primary)",
                  transition: "all 0.3s ease",
                  width: `${progress * 100}%`,
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: "0.875rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.375rem",
              }}
            >
              <span style={{ color: "var(--ifm-color-emphasis-600)" }}>
                Current XP
              </span>
              <span style={{ fontWeight: "500" }}>
                {score.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--ifm-color-emphasis-600)" }}>
                Next Level
              </span>
              <span style={{ fontWeight: "500" }}>
                {pointsToNext.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface LeaderboardEntryProps {
  rank: number;
  username: string;
  score: number;
  avatar?: string;
  badges?: string[];
}

export const LeaderboardEntry: React.FC<LeaderboardEntryProps> = ({
  rank,
  username,
  score,
  avatar,
  badges = [],
}) => {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank.toString();
  };

  const getRankColor = (rank: number) => {
    if (rank <= 3) return "var(--ifm-color-primary)";
    if (rank <= 10) return "var(--ifm-color-secondary-darker)";
    return "var(--ifm-color-emphasis-300)";
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "1rem 1.25rem",
        border: "1px solid var(--ifm-color-emphasis-200)",
        borderRadius: "12px",
        marginBottom: "0.75rem",
        gap: "1rem",
        background: "var(--ifm-card-background-color)",
        transition: "all 0.2s ease-in-out",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateX(4px)";
        e.currentTarget.style.backgroundColor =
          "var(--ifm-color-secondary-lighter)";
        e.currentTarget.style.borderColor = "var(--ifm-color-primary-lighter)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateX(0)";
        e.currentTarget.style.backgroundColor =
          "var(--ifm-card-background-color)";
        e.currentTarget.style.borderColor = "var(--ifm-color-emphasis-200)";
      }}
    >
      <div
        style={{
          minWidth: "2.5rem",
          height: "2.5rem",
          borderRadius: "50%",
          backgroundColor: getRankColor(rank),
          color: rank <= 3 ? "white" : "var(--ifm-font-color-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: rank <= 3 ? "1.2rem" : "0.9rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        {getRankIcon(rank)}
      </div>

      {avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={username}
          style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid var(--ifm-color-emphasis-200)",
            transition: "transform 0.2s ease",
          }}
        />
      )}

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: "600",
            fontSize: "1rem",
            marginBottom: "0.25rem",
          }}
        >
          {username}
        </div>
        <div
          style={{
            fontSize: "0.9rem",
            color: "var(--ifm-color-emphasis-600)",
            fontWeight: "500",
          }}
        >
          {score.toLocaleString()} XP
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {badges.map((badge, index) => (
          <Badge key={index} variant="secondary">
            {badge}
          </Badge>
        ))}
      </div>
    </div>
  );
};
