# Correo de confirmación — link incorrecto

El enlace del email lo arma **Supabase**, no Vercel. Hay que configurar las URLs ahí.

## 1. Supabase Dashboard (obligatorio)

Ve a: **Authentication → URL Configuration**

| Campo | Valor |
|--------|--------|
| **Site URL** | `https://hackathon-agentic-scale-by-taws-11-07-syntax-error3.vercel.app` |
| **Redirect URLs** | Agrega estas (una por línea): |

```
https://hackathon-agentic-scale-by-taws-11-07-syntax-error3.vercel.app/**
https://hackathon-agentic-scale-by-taws-11-07-syntax-error3.vercel.app/login
http://localhost:5173/**
http://localhost:5173/login
```

Guarda los cambios.

## 2. Código (ya aplicado)

El registro envía `emailRedirectTo` al origen actual, por ejemplo:
`https://…vercel.app/login`

Así el correo no apunta a `localhost` cuando te registras desde Vercel.

## 3. Probar

1. Haz deploy del último código (o espera el deploy automático de GitHub).
2. Regístrate **desde la URL de Vercel** (no desde localhost).
3. Abre el correo nuevo (los viejos siguen con el link anterior).

Si el link sigue mal: revisa **Authentication → Email Templates → Confirm signup** y que use `{{ .ConfirmationURL }}`.
