import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== USUARIOS ===');
  const usuarios = await prisma.usuario.findMany();
  console.log(JSON.stringify(usuarios, null, 2));
  
  console.log('\n=== EMPLEADOS ===');
  const empleados = await prisma.empleado.findMany();
  console.log(JSON.stringify(empleados, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
