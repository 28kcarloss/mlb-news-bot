const { GoogleGenerativeAI } = require("@google/generative-ai");
const { google } = require("googleapis");

async function run() {
  // 1. Configuración de APIs
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const blogger = google.blogger({ version: "v3", auth: oauth2Client });

  // 2. Obtener datos de la MLB (Resultados de hoy)
  const resMLB = await fetch("https://statsapi.mlb.com/api/v1/schedule?sportId=1");
  const datos = await resMLB.json();
  
  if (!datos.dates || datos.dates.length === 0) return console.log("No hay juegos hoy.");

  // 3. Pedir a Gemini que redacte la noticia
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Eres un cronista deportivo dominicano experto en MLB. 
    Basado en estos datos: ${JSON.stringify(datos.dates[0].games)}, escribe una noticia emocionante para un blog. 
    REGLAS:
    1. Enfócate en los jugadores dominicanos si tuvieron buena actuación.
    2. Usa términos de béisbol (jonrón, ponche, extra base).
    3. No menciones el aguacate bajo ninguna circunstancia.
    4. Devuelve el contenido en formato HTML con títulos <h2> y párrafos <p>.
    5. El título debe ser impactante.`;

  const result = await model.generateContent(prompt);
  const textoNoticia = result.response.text();
  
  // Extraer un título del primer h2 o usar uno por defecto
  const titulo = "Resumen de Grandes Ligas: ¡Puro Fuego en el Diamante!";

  // 4. Publicar en Blogger
  await blogger.posts.insert({
    blogId: process.env.BLOG_ID,
    requestBody: {
      title: titulo,
      content: textoNoticia,
      labels: ["MLB", "Noticias", "Automatizado"]
    }
  });

  console.log("¡Noticia publicada!");
}

run().catch(console.error);
