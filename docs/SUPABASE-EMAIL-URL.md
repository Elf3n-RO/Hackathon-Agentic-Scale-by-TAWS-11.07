# Registro + confirmación de email (Supabase)

Para que el enlace del correo sea correcto y los usuarios puedan usar la app.

## A. Configuración obligatoria en Supabase

Abre: **Authentication → URL Configuration**

### Site URL
```
https://hackathon-agentic-scale-by-taws-11-07-syntax-error3.vercel.app
```

### Redirect URLs (agregar todas)
```
https://hackathon-agentic-scale-by-taws-11-07-syntax-error3.vercel.app/**
https://hackathon-agentic-scale-by-taws-11-07-syntax-error3.vercel.app/auth/callback
https://hackathon-agentic-scale-by-taws-11-07-syntax-error3.vercel.app/login
https://hackathon-agentic-scale-by-taws-11.vercel.app/**
https://hackathon-agentic-scale-by-taws-11.vercel.app/auth/callback
http://localhost:5173/**
http://localhost:5173/auth/callback
http://localhost:5173/login
```

Guarda.

## B. Opción recomendada para el hackathon (sin fricción)

**Authentication → Providers → Email → Confirm email → OFF**

Así el usuario se registra y entra al instante, sin correo.

Si dejas Confirm email **ON**, el flujo es:
1. Registro en Vercel  
2. Correo → enlace a `/auth/callback`  
3. La app crea sesión + perfil y entra a `/app`

## C. SQL de perfiles (si el signup falla en BD)

Ejecuta en SQL Editor: `supabase/fix-signup.sql` y `supabase/schema.sql` (si aún no).

## D. Probar

1. Espera el deploy de Vercel (o Redeploy).  
2. Entra a la URL de producción → Crear cuenta.  
3. Si hay confirmación: abre el **correo nuevo** (no uno viejo).  
4. Debes caer en la app y poder usar el chat.
