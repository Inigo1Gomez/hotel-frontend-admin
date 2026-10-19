// Backend en EC2. La IP pública cambia cada vez que se detiene/inicia la instancia (sin Elastic IP),
// así que se lee de EC2_HOST en vez de dejarla fija en el archivo:
//   PowerShell: $env:EC2_HOST = '52.207.150.52'; npm run start:ec2
const host = process.env.EC2_HOST?.trim();

if (!host) {
  throw new Error(
    "Falta EC2_HOST con la IP o DNS público de la instancia. Ej: $env:EC2_HOST = '52.207.150.52'; npm run start:ec2",
  );
}

function microservicio(prefijo, puerto) {
  return {
    target: `http://${host}:${puerto}`,
    secure: false,
    changeOrigin: true,
    pathRewrite: { [`^${prefijo}`]: '' },
  };
}

export default {
  '/api/usuarios': microservicio('/api/usuarios', 8082),
  '/api/reservas': microservicio('/api/reservas', 8081),
};
