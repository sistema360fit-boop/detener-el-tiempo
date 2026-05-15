import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./prisma/dev.db"
    }
  }
});

async function main() {
  console.log('🌱 Starting seed...');

  // Check if admin already exists in Usuario table
  const existingAdmin = await prisma.usuario.findUnique({
    where: { email: 'admin' }
  });

  // Generar hash bcrypt dinámicamente desde variable de entorno
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('❌ ERROR: Variable de entorno ADMIN_PASSWORD no configurada');
    console.error('   Por favor, configura ADMIN_PASSWORD antes de ejecutar el seed');
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  if (existingAdmin) {
    // Update password if user exists
    await prisma.usuario.update({
      where: { email: 'admin' },
      data: { password: hashedPassword }
    });
    console.log('✅ Admin user password updated');
    console.log('   Password:', process.env.ADMIN_PASSWORD ? '(from env)' : 'admin123');
  } else {
    // Create default admin user (password: admin123)
    const admin = await prisma.usuario.create({
      data: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin',
        password: hashedPassword,
        nombre: 'Administrador',
        rol: 'administrador',
        activo: true,
      }
    });
    console.log('✅ Admin user created');
  }
  
  // Also create/update in Empleado table for compatibility
  const existingEmpleado = await prisma.empleado.findFirst({
    where: { nombre: 'Administrador' }
  });
  
  if (existingEmpleado) {
    await prisma.empleado.update({
      where: { id: existingEmpleado.id },
      data: { 
        rol: 'administrador',
        activo: true,
        // Also store password in contrasena field for compatibility
        // Note: We're not updating contrasena since we use bcrypt in Usuario table
      }
    });
    console.log('✅ Empleado admin updated');
  } else {
    await prisma.empleado.create({
      data: {
        id: '00000000-0000-0000-0000-000000000002',
        nombre: 'Administrador',
        usuario: 'admin',  // username field
        rol: 'administrador',
        activo: true,
      }
    });
    console.log('✅ Empleado admin created with username: admin');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
