import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// En producción Vercel sirve api/*.js como funciones serverless. En local no
// existe nadie que lo haga, así que este plugin monta el mismo fichero sobre el
// dev server.
//
// ponytail: 20 líneas de shim en vez de exigir `vercel dev` (y por tanto CLI y
// login) solo para poder probar. Es el MISMO api/tailor.js en los dos sitios,
// no una copia: si funciona aquí, funciona desplegado.
function apiDev(env) {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        // /api/tailor -> api/tailor.js, igual que hace Vercel.
        const name = (req.url ?? '').split('?')[0].replace(/^\/+/, '')
        if (!/^[a-z0-9_-]+$/i.test(name)) return next()

        Object.assign(process.env, env) // la API key sale de .env.local
        try {
          const chunks = []
          for await (const c of req) chunks.push(c)
          req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}

          // Vercel da res.status().json(); node http no.
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (data) => {
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(data))
          }

          const { default: handler } = await server.ssrLoadModule(`/api/${name}.js`)
          await handler(req, res)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // '' = también las sin prefijo VITE_
  return { plugins: [react(), apiDev(env)] }
})
