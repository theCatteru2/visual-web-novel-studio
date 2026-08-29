Manual de Usuario: Visual Web Novel Studio
Bienvenido a Visual Web Novel Studio, el motor visual para crear y jugar novelas visuales interactivas directamente desde tu navegador, sin necesidad de escribir código.


1. Primeros Pasos
La Pantalla de Inicio
Al ingresar al estudio encontrarás las opciones principales:

✨ Crear Nuevo Proyecto: Comienza una historia en blanco desde cero.
🎮 Cargar Proyecto Demo: Carga una historia de ejemplo con personajes, fondos y elecciones ya configurados para ver cómo funciona el motor.
📚 Mi Biblioteca: Accede a tus proyectos guardados en la nube.
🌐 Comunidad: Explora, juega y descarga historias creadas por otros autores.


2. Creando a tus Personajes
Antes de redactar la historia, es ideal crear tu elenco de personajes desde el botón 👥 Personajes:

Datos Básicos:
Nombre: El nombre que aparecerá sobre la caja de diálogo.
Color: Color identificador que tendrá el nombre y el borde de su caja de texto.
Avatar: Imagen principal o miniatura del personaje.
Biografía: Breve descripción de su personalidad o rol.
Galería de Expresiones:
Sube las distintas expresiones o poses de tu personaje (ejemplo: normal, feliz, sonrojada, seria, enojada).
Al escribir diálogos, podrás cambiar la cara del personaje al instante eligiendo la expresión adecuada.
Afinidad y Estadísticas:
Barra de Afinidad: Actívala si quieres que el jugador vea una barra que sube o baja según las decisiones que tome con ese personaje.
Árbol de Relaciones: Traza conexiones entre personajes (ej. amigos, rivales, familia) para organizar el universo de tu historia.


3. El Editor Visual: Creando la Historia Paso a Paso
El Editor es tu mesa de trabajo principal. Se divide en dos áreas: la Línea de Tiempo (a la izquierda/abajo) y el Escenario en Vivo (al centro).
A. Viñetas de Diálogo
Cada viñeta representa un momento en la escena:

Seleccionar Hablante: Elige qué personaje habla, selecciona Narrador (para texto descriptivo sin nombre) o Protagonista.
Escribir el Texto:
Escribe lo que dice el personaje.
Nombre dinámico del jugador: Escribe {player} en cualquier parte del texto y el motor lo sustituirá automáticamente por el nombre que el jugador haya ingresado al inicio.
Mostrar variables: Si creaste una variable llamada oro o puntos, puedes escribir {oro} o {puntos} para que aparezca su valor en tiempo real.
Puesta en Escena (Colocar Personajes):
Haz clic en Añadir Personaje a Escena.
Posición Horizontal (7 ranuras): Extremo Izquierdo, Izquierda, Centro-Izquierda, Centro, Centro-Derecha, Derecha o Extremo Derecho.
Posición Vertical: Elige si el personaje está de pie (Normal), sentado en el suelo (Suelo), elevado o asomándose.
Tamaño (Escala): Pequeño (fondo), Mediano (estándar), Grande (primer plano) o Closeup (muy cerca).
Brillo: Baja el brillo de los personajes que estén en silencio para dar sensación de profundidad.
Animación: Elige un movimiento de entrada o reacción (Rebote, Temblor, Deslizar, Aparición suave).
Fondo y Efectos:
Selecciona el fondo del lugar donde transcurre la acción.
Efectos de pantalla: Sacudida (shake), destello (flash) o fundido a negro (fade_black).
Música y Sonidos:
BGM (Música de fondo): Selecciona una canción que seguirá sonando en bucle. Si quieres que la música se detenga en una viñeta, selecciona stop.
SFX (Efecto de sonido): Sonido único que se reproduce al entrar a esa viñeta (ej. timbre, portazo, pasos).


B. Viñetas de Elección (Toma de Decisiones)
Las elecciones detienen la historia y le dan el control al jugador:

Pregunta / Prompt: Escribe el dilema (ej. "¿Qué camino decides tomar?").
Crear Opciones: Añade los botones que verá el lector. Para cada opción puedes definir:
Texto: Lo que dice el botón (ej. "Ir al bosque" o "Quedarse en casa").
Saltar a otra Rama o Escena: Elige hacia dónde se desvía la historia si el jugador presiona ese botón.
Afectar Afinidad: Sube o baja puntos con un personaje (ej. Mio: +5).
Cambiar Variables: Modifica datos del juego (ej. sumar +10 monedas o marcar que tiene_mapa = true).


4. Ramas y Rutas Alternativas (Branches)
Para crear rutas ramificadas (como la ruta de un personaje específico o un final alternativo):

En el panel de escenas, presiona + Nueva Rama y dale un nombre (ej. ruta_bosque).
Diseña las viñetas exclusivas de esa ruta.
En la viñeta de decisión de la rama principal, conecta la opción correspondiente hacia ruta_bosque.
Saltos Condicionales Automáticos: Puedes hacer que una viñeta de diálogo salte automáticamente a otra rama si se cumple una condición previa (ej. si tiene_mapa == true, salta a camino_secreto).


5. Variables y Banderas del Juego
Desde el menú Variables puedes crear contadores y condiciones:

Variables de Sí/No (Booleanas): Para recordar eventos (ej. hablo_con_guardia = true).
Variables Numéricas: Para puntuaciones, dinero o contadores de tiempo.
Mostrar en HUD: Si marcas una variable como visible, aparecerá en una etiqueta en la parte superior de la pantalla durante la lectura.


6. Probar tu Historia (Playtest)
Botón ▶ PROBAR: Inicia la historia en el reproductor a pantalla completa.
Controles del Jugador:
Avanzar texto: Haz clic en la pantalla o presiona la barra espaciadora.
Velocidad de lectura: El texto se escribe progresivamente. Si haces un clic mientras se escribe, se completa al instante; con el siguiente clic avanzas a la próxima viñeta.
Historial (📜): Abre el registro para releer diálogos pasados.
Guardar / Cargar (💾): Permite guardar la partida en múltiples ranuras con capturas de pantalla de la escena actual.


7. Guardar, Exportar y Compartir
Guardar en tu Biblioteca Privada (Nube):
Ve a 📚 Biblioteca y haz clic en Guardar Borrador Actual. Tu historia quedará almacenada en tu cuenta de Google/Firebase.
Descargar Archivo JSON:
En la barra superior, haz clic en 📥 Exportar para guardar una copia de seguridad en tu computadora.
Publicar en la Comunidad:
Haz clic en 🚀 Publicar. Completa la portada, sinopsis y etiquetas (Romance, Misterio, Fantasía, etc.).
Puedes elegir si permites que otros creadores clonen tu proyecto para aprender o traducirlo.
Compartir por Enlace Privado:
Desde tu biblioteca, presiona 🔗 Copiar Enlace Privado para enviar un enlace directo a tus amigos sin necesidad de hacer pública la novela en el catálogo abierto.

