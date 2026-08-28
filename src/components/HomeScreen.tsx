import { useState, useEffect, useRef } from 'react';
import { useNovel } from '../context/NovelContext';

interface HomeScreenProps {
  onOpenEditor: () => void;
  onStartTest: () => void;
  onOpenCommunity: () => void;
  onOpenProfile: () => void;
  onOpenLibrary: () => void;
}

/* =========================================================
   ICONOS SVG
========================================================= */

type IconName =
  | 'feather'
  | 'play'
  | 'folder'
  | 'save'
  | 'users'
  | 'user'
  | 'star'
  | 'arrow'
  | 'book'
  | 'coffee';

function Icon({
  name,
  size = 24,
  strokeWidth = 1.8
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    style: {
      display: 'block',
      flexShrink: 0
    }
  };

  switch (name) {
    case 'feather':
      return (
        <svg {...common}>
          <path
            d="M20.5 3.5C14.2 3.7 8.8 5.5 5.5 9.1C2.9 11.9 3.2 15.7 3.5 17.5C5.3 17.8 9.1 18.1 11.9 15.5C15.5 12.2 17.3 6.8 17.5 3.5Z"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 20.5C7.5 15.8 11.4 12.1 16.8 8"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 13.5L5.5 11M11 10.5L8.5 8M14 7.5L11.8 5.3"
            stroke="currentColor"
            strokeWidth={strokeWidth - 0.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'play':
      return (
        <svg {...common}>
          <path
            d="M8 5.5L18 12L8 18.5V5.5Z"
            fill="currentColor"
          />
        </svg>
      );

    case 'book':
      return (
        <svg {...common}>
          <path
            d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'folder':
      return (
        <svg {...common}>
          <path
            d="M3.5 6.5C3.5 5.67 4.17 5 5 5H9L11 7H19C19.83 7 20.5 7.67 20.5 8.5V17.5C20.5 18.33 19.83 19 19 19H5C4.17 19 3.5 18.33 3.5 17.5V6.5Z"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 9H20.5"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'save':
      return (
        <svg {...common}>
          <path
            d="M5 4H17L20 7V20H5V4Z"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 4V10H16V4"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 20V14H17V20"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'users':
      return (
        <svg {...common}>
          <circle
            cx="9"
            cy="8"
            r="3"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
          <path
            d="M3.5 19C3.8 15.7 5.7 13.5 9 13.5C12.3 13.5 14.2 15.7 14.5 19"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d="M15 5.5C16.9 5.6 18.2 6.8 18.2 8.5C18.2 10 17.2 11.2 15.7 11.5"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d="M17 14C19.1 14.6 20.3 16.3 20.5 19"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
      );

    case 'user':
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="8"
            r="3.5"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
          <path
            d="M4.5 20C4.9 15.8 7.4 13.5 12 13.5C16.6 13.5 19.1 15.8 19.5 20"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
      );

    case 'star':
      return (
        <svg {...common}>
          <path
            d="M12 3L13.35 10.65L21 12L13.35 13.35L12 21L10.65 13.35L3 12L10.65 10.65L12 3Z"
            fill="currentColor"
          />
        </svg>
      );

    case 'arrow':
      return (
        <svg {...common}>
          <path
            d="M5 12H18"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d="M13 6L19 12L13 18"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'coffee':
      return (
        <svg {...common}>
          <path
            d="M18 8h1a4 4 0 0 1 0 8h-1"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="6"
            y1="1"
            x2="6"
            y2="4"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1="1"
            x2="10"
            y2="4"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <line
            x1="14"
            y1="1"
            x2="14"
            y2="4"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return null;
  }
}

/* =========================================================
   HOME SCREEN
========================================================= */

export default function HomeScreen({
  onOpenEditor,
  onStartTest,
  onOpenCommunity,
  onOpenProfile,
  onOpenLibrary
}: HomeScreenProps) {
  const {
    project,
    setProject,
    importProjectJson,
    exportProjectJson,
    startPlaytest
  } = useNovel();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPortrait, setIsPortrait] = useState(
    window.innerHeight > window.innerWidth
  );

  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = event => {
      const content = event.target?.result as string;

      if (content) {
        const ok = importProjectJson(content);

        if (ok) {
          onOpenEditor();
        } else {
          alert('Error al leer el archivo JSON.');
        }
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTestProject = () => {
    startPlaytest(undefined, true);
    onStartTest();
  };

  const totalScenes = project.chapters.reduce(
    (acc, chapter) => acc + chapter.scenes.length,
    0
  );

  const totalChars = Object.keys(project.characters || {}).length;
  const totalVars = Object.keys(project.variables || {}).length;

  const scale = isPortrait ? 1 : 0.92;

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100%',
        minHeight: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        color: '#fff',
        userSelect: 'none',
        background: `
          radial-gradient(
            circle at 50% 15%,
            rgba(74, 52, 150, 0.30) 0%,
            rgba(20, 18, 50, 0.18) 28%,
            transparent 55%
          ),
          radial-gradient(
            circle at 15% 80%,
            rgba(0, 110, 255, 0.10) 0%,
            transparent 35%
          ),
          radial-gradient(
            circle at 90% 70%,
            rgba(150, 45, 255, 0.10) 0%,
            transparent 35%
          ),
          linear-gradient(
            145deg,
            #050611 0%,
            #090a1b 45%,
            #050611 100%
          )
        `,
        padding: isPortrait
          ? '22px 16px 30px'
          : '28px 40px 36px'
      }}
    >
      {/* Fondo cuadriculado */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.28,
          backgroundImage: `
            linear-gradient(
              rgba(100, 120, 255, 0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(100, 120, 255, 0.035) 1px,
              transparent 1px
            )
          `,
          backgroundSize: '42px 42px',
          maskImage:
            'linear-gradient(to bottom, black, transparent 85%)'
        }}
      />

      {/* Estrellas */}
      <div
        style={{
          position: 'fixed',
          top: '12%',
          left: '8%',
          width: 3,
          height: 3,
          borderRadius: '50%',
          background: '#8c7cff',
          boxShadow: `
            120px 80px #477cff,
            240px -30px #b678ff,
            420px 120px #62cfff,
            650px -20px #8c7cff,
            820px 160px #477cff,
            940px 30px #b678ff,
            300px 300px #477cff,
            720px 350px #8c7cff
          `,
          pointerEvents: 'none',
          opacity: 0.7
        }}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
      />

      <main
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 1050,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: isPortrait ? 16 : 18,
          transform: `scale(${scale})`,
          transformOrigin: 'top center'
        }}
      >
        {/* =========================
            HEADER
        ========================= */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isPortrait ? '4px 2px' : '4px 8px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14
            }}
          >
            <div
              style={{
                width: isPortrait ? 46 : 52,
                height: isPortrait ? 46 : 52,
                borderRadius: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `
                  linear-gradient(
                    145deg,
                    rgba(101, 79, 255, 0.25),
                    rgba(22, 177, 255, 0.10)
                  )
                `,
                border: '1px solid rgba(126, 111, 255, 0.55)',
                color: '#9e8cff',
                boxShadow: `
                  0 0 25px rgba(104, 82, 255, 0.20),
                  inset 0 0 20px rgba(100, 100, 255, 0.06)
                `
              }}
            >
              <Icon
                name="feather"
                size={isPortrait ? 27 : 31}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: isPortrait ? 17 : 20,
                  fontWeight: 900,
                  letterSpacing: 2,
                  lineHeight: 1
                }}
              >
                VISUAL NOVEL
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: isPortrait ? 9 : 10,
                  fontWeight: 800,
                  letterSpacing: 5,
                  color: '#729cff'
                }}
              >
                STUDIO
              </div>
            </div>
          </div>

          {/* LADO DERECHO: KO-FI Y ESTADO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* BOTÓN KO-FI */}
            <a
              href="https://ko-fi.com/thejoirent"
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHovered('kofi')}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: isPortrait ? '7px 11px' : '8px 14px',
                borderRadius: 20,
                background: hovered === 'kofi' ? 'rgba(255, 95, 95, 0.22)' : 'rgba(255, 95, 95, 0.12)',
                border: `1px solid ${hovered === 'kofi' ? 'rgba(255, 120, 120, 0.65)' : 'rgba(255, 95, 95, 0.35)'}`,
                color: '#ff8a8a',
                fontSize: isPortrait ? 10 : 11,
                fontWeight: 800,
                letterSpacing: 0.5,
                textDecoration: 'none',
                transition: 'all 150ms ease',
                transform: hovered === 'kofi' ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: hovered === 'kofi' ? '0 0 15px rgba(255, 95, 95, 0.25)' : 'none'
              }}
            >
              <Icon name="coffee" size={14} />
              <span>{isPortrait ? 'KO-FI' : 'APOYAR EN KO-FI'}</span>
            </a>

            {/* BADGE ESTADO (Visible en Desktop) */}
            <div
              style={{
                display: isPortrait ? 'none' : 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 20,
                background: 'rgba(8, 12, 28, 0.65)',
                border: '1px solid rgba(110, 130, 220, 0.16)',
                color: '#8290b4',
                fontSize: 10,
                fontWeight: 700
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#35e99a',
                  boxShadow: '0 0 10px rgba(53, 233, 154, 0.7)'
                }}
              />
              PROYECTO LISTO
            </div>
          </div>
        </header>

        {/* =========================
            TÍTULO
        ========================= */}
        <section
          style={{
            textAlign: 'center',
            padding: isPortrait
              ? '8px 0 4px'
              : '14px 0 8px'
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: isPortrait ? 29 : 39,
              lineHeight: 1,
              fontWeight: 950,
              letterSpacing: -1.2,
              background:
                'linear-gradient(90deg, #ffffff 25%, #9dbaff 75%, #c89cff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Crea tu historia.
          </h1>

          <p
            style={{
              margin: '9px 0 0',
              color: '#687394',
              fontSize: isPortrait ? 11 : 12,
              letterSpacing: 0.4
            }}
          >
            Motor de narrativa visual
          </p>
        </section>

        {/* =========================
            PROYECTO ACTIVO
        ========================= */}
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            boxSizing: 'border-box',
            padding: isPortrait ? 16 : 22,
            borderRadius: 18,
            background: `
              linear-gradient(
                135deg,
                rgba(19, 21, 49, 0.95),
                rgba(9, 11, 27, 0.94)
              )
            `,
            border: '1px solid rgba(105, 118, 210, 0.28)',
            boxShadow: `
              0 20px 60px rgba(0, 0, 0, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.04)
            `
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -100,
              right: -70,
              width: 240,
              height: 240,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(104, 83, 255, 0.14), transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: isPortrait
                ? 'flex-start'
                : 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexDirection: isPortrait
                ? 'column'
                : 'row'
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                width: '100%'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 1.5,
                    color: '#9d8cff'
                  }}
                >
                  PROYECTO ACTIVO
                </span>

                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#3ee9a2'
                  }}
                />
              </div>

              <input
                type="text"
                value={project.title}
                onChange={e =>
                  setProject(prev => ({
                    ...prev,
                    title: e.target.value
                  }))
                }
                placeholder="Título de la novela..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 0,
                  margin: 0,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: '#f7f8ff',
                  fontSize: isPortrait ? 23 : 28,
                  fontWeight: 900,
                  letterSpacing: -0.5,
                  userSelect: 'text'
                }}
              />

              <p
                style={{
                  margin: '7px 0 0',
                  color: '#657091',
                  fontSize: 11
                }}
              >
                Tu proyecto de narrativa visual
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                borderRadius: 12,
                overflow: 'hidden',
                border:
                  '1px solid rgba(105, 118, 210, 0.16)',
                background: 'rgba(4, 6, 18, 0.48)',
                width: isPortrait ? '100%' : 'auto'
              }}
            >
              <Stat
                value={totalScenes}
                label="ESCENAS"
                accent="#72a7ff"
              />

              <div
                style={{
                  width: 1,
                  background:
                    'rgba(110, 120, 180, 0.14)'
                }}
              />

              <Stat
                value={totalChars}
                label="PERSONAJES"
                accent="#c184ff"
              />

              <div
                style={{
                  width: 1,
                  background:
                    'rgba(110, 120, 180, 0.14)'
                }}
              />

              <Stat
                value={totalVars}
                label="VARIABLES"
                accent="#42e9a0"
              />
            </div>
          </div>
        </section>

        {/* =========================
            ACCIONES PRINCIPALES
        ========================= */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isPortrait
              ? '1fr'
              : 'repeat(2, minmax(0, 1fr))',
            gap: 14
          }}
        >
          <MainAction
            name="editor"
            hovered={hovered}
            setHovered={setHovered}
            icon="feather"
            title="EDITAR GUIÓN"
            description="Escribe y organiza tu historia"
            onClick={onOpenEditor}
            accent="#62a2ff"
            background={`
              radial-gradient(
                circle at 80% 20%,
                rgba(45, 126, 255, 0.15),
                transparent 45%
              ),
              linear-gradient(
                145deg,
                rgba(12, 34, 78, 0.95),
                rgba(7, 14, 36, 0.98)
              )
            `}
          />

          <MainAction
            name="test"
            hovered={hovered}
            setHovered={setHovered}
            icon="play"
            title="PROBAR NOVELA"
            description="Reproduce y prueba tu historia"
            onClick={handleTestProject}
            accent="#42e9a0"
            background={`
              radial-gradient(
                circle at 80% 20%,
                rgba(34, 220, 145, 0.13),
                transparent 45%
              ),
              linear-gradient(
                145deg,
                rgba(8, 57, 51, 0.92),
                rgba(6, 26, 29, 0.98)
              )
            `}
          />
        </section>

        {/* =========================
            GESTIÓN
        ========================= */}
        <section
          style={{
            borderRadius: 16,
            padding: isPortrait ? 13 : 16,
            background: 'rgba(11, 13, 29, 0.72)',
            border:
              '1px solid rgba(100, 112, 180, 0.18)'
          }}
        >
          <div
            style={{
              padding: '0 5px 11px',
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: 1.6,
              color: '#667293'
            }}
          >
            GESTIÓN DEL PROYECTO
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPortrait
                ? '1fr'
                : 'repeat(2, 1fr)',
              gap: 9
            }}
          >
            <SmallAction
              name="import"
              hovered={hovered}
              setHovered={setHovered}
              icon="folder"
              title="CARGAR PROYECTO"
              description="Abrir archivo JSON"
              onClick={() =>
                fileInputRef.current?.click()
              }
              accent="#bd7cff"
            />

            <SmallAction
              name="export"
              hovered={hovered}
              setHovered={setHovered}
              icon="save"
              title="GUARDAR PROYECTO"
              description="Exportar como JSON"
              onClick={exportProjectJson}
              accent="#68cfff"
            />
          </div>
        </section>

        {/* =========================
            BIBLIOTECA / COMUNIDAD / PERFIL
        ========================= */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isPortrait
              ? '1fr'
              : 'repeat(3, 1fr)',
            gap: 10
          }}
        >
          <NavigationCard
            name="library"
            hovered={hovered}
            setHovered={setHovered}
            icon="book"
            title="MI BIBLIOTECA"
            description="Gestiona hasta 15 novelas privadas"
            onClick={onOpenLibrary}
            accent="#a855f7"
          />

          <NavigationCard
            name="community"
            hovered={hovered}
            setHovered={setHovered}
            icon="users"
            title="EXPLORAR COMUNIDAD"
            description="Descubre historias de otros autores"
            onClick={onOpenCommunity}
            accent="#c17cff"
          />

          <NavigationCard
            name="profile"
            hovered={hovered}
            setHovered={setHovered}
            icon="user"
            title="MI PERFIL"
            description="Gestiona tu cuenta y proyectos"
            onClick={onOpenProfile}
            accent="#70bfff"
          />
        </section>

        {/* =========================
            FOOTER
        ========================= */}
        <footer
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
            paddingTop: 2,
            color: '#4f5975',
            fontSize: 9,
            letterSpacing: 0.4
          }}
        >
          <span style={{ color: '#8a7cff' }}>
            <Icon name="star" size={10} />
          </span>

          Guarda tu proyecto frecuentemente

          <span style={{ color: '#8a7cff' }}>
            <Icon name="star" size={10} />
          </span>
        </footer>
      </main>
    </div>
  );
}

/* =========================================================
   ESTADÍSTICA
========================================================= */

interface StatProps {
  value: number;
  label: string;
  accent: string;
}

function Stat({
  value,
  label,
  accent
}: StatProps) {
  return (
    <div
      style={{
        minWidth: 75,
        padding: '12px 15px',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          fontSize: 20,
          lineHeight: 1,
          fontWeight: 950,
          color: '#f5f7ff'
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 8,
          fontWeight: 900,
          letterSpacing: 1,
          color: accent
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* =========================================================
   ACCIÓN PRINCIPAL
========================================================= */

interface MainActionProps {
  name: string;
  hovered: string | null;
  setHovered: (name: string | null) => void;
  icon: IconName;
  title: string;
  description: string;
  onClick: () => void;
  accent: string;
  background: string;
}

function MainAction({
  name,
  hovered,
  setHovered,
  icon,
  title,
  description,
  onClick,
  accent,
  background
}: MainActionProps) {
  const active = hovered === name;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(name)}
      onMouseLeave={() => setHovered(null)}
      style={{
        position: 'relative',
        minHeight: 205,
        padding: 25,
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        color: '#fff',
        border: `1px solid ${accent}90`,
        background,
        boxShadow: active
          ? `0 15px 45px ${accent}30`
          : '0 10px 30px rgba(0, 0, 0, 0.20)',
        transition: 'all 160ms ease',
        transform: active ? 'translateY(-3px)' : 'translateY(0)',
        filter: active ? 'brightness(1.12)' : 'brightness(1)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -30,
          top: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          border: `1px solid ${accent}18`,
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          background: `${accent}18`,
          border: `1px solid ${accent}55`,
          marginBottom: 18
        }}
      >
        <Icon
          name={icon}
          size={27}
          strokeWidth={1.7}
        />
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 950,
          letterSpacing: 0.5
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 5,
          color: '#8299c8',
          fontSize: 11
        }}
      >
        {description}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 21,
          bottom: 19,
          color: accent
        }}
      >
        <Icon name="arrow" size={23} />
      </div>
    </button>
  );
}

/* =========================================================
   ACCIÓN PEQUEÑA
========================================================= */

interface SmallActionProps {
  name: string;
  hovered: string | null;
  setHovered: (name: string | null) => void;
  icon: IconName;
  title: string;
  description: string;
  onClick: () => void;
  accent: string;
}

function SmallAction({
  name,
  hovered,
  setHovered,
  icon,
  title,
  description,
  onClick,
  accent
}: SmallActionProps) {
  const active = hovered === name;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(name)}
      onMouseLeave={() => setHovered(null)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        width: '100%',
        minHeight: 65,
        padding: '10px 13px',
        boxSizing: 'border-box',
        borderRadius: 11,
        cursor: 'pointer',
        textAlign: 'left',
        color: '#fff',
        background: active
          ? 'rgba(42, 47, 82, 0.65)'
          : 'rgba(17, 20, 42, 0.60)',
        border: `1px solid ${
          active
            ? `${accent}66`
            : 'rgba(100, 112, 180, 0.14)'
        }`,
        transform: active ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 150ms ease'
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 39,
          height: 39,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${accent}14`,
          border: `1px solid ${accent}35`,
          color: accent
        }}
      >
        <Icon name={icon} size={20} />
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.7
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 4,
            color: '#606b89',
            fontSize: 9
          }}
        >
          {description}
        </div>
      </div>

      <div
        style={{
          color: active ? accent : '#505a78',
          transition: 'all 150ms ease'
        }}
      >
        <Icon name="arrow" size={19} />
      </div>
    </button>
  );
}

/* =========================================================
   TARJETA DE NAVEGACIÓN
========================================================= */

interface NavigationCardProps {
  name: string;
  hovered: string | null;
  setHovered: (name: string | null) => void;
  icon: IconName;
  title: string;
  description: string;
  onClick: () => void;
  accent: string;
}

function NavigationCard({
  name,
  hovered,
  setHovered,
  icon,
  title,
  description,
  onClick,
  accent
}: NavigationCardProps) {
  const active = hovered === name;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(name)}
      onMouseLeave={() => setHovered(null)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        width: '100%',
        minHeight: 72,
        padding: '12px 15px',
        boxSizing: 'border-box',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        color: '#fff',
        background: active
          ? 'rgba(26, 29, 57, 0.92)'
          : 'rgba(10, 12, 27, 0.72)',
        border: `1px solid ${
          active
            ? `${accent}70`
            : 'rgba(100, 112, 180, 0.16)'
        }`,
        transform: active ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: active
          ? `0 10px 30px ${accent}12`
          : 'none',
        transition: 'all 150ms ease'
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 43,
          height: 43,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          border: `1px solid ${accent}40`,
          background: `${accent}0d`
        }}
      >
        <Icon
          name={icon}
          size={22}
          strokeWidth={1.7}
        />
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.8
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 5,
            fontSize: 9,
            color: '#5e6885'
          }}
        >
          {description}
        </div>
      </div>

      <div
        style={{
          color: active ? accent : '#505a78'
        }}
      >
        <Icon name="arrow" size={20} />
      </div>
    </button>
  );
}
