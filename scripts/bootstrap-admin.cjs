
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const ROLES = [
  ['super_admin', 'Super Administrator', 'Full portal administration'],
  ['state_pmu_admin', 'State PMU Admin', 'State PMU administration'],
  ['det_content_admin', 'DET Content Admin', 'DET content management'],
  ['cluster_admin', 'Cluster Admin', 'Cluster-level administration'],
  ['hub_iti_user', 'Hub ITI User', 'Hub ITI operator'],
  ['spoke_iti_user', 'Spoke ITI User', 'Spoke ITI operator'],
  ['aip_user', 'AIP User', 'Anchor Industry Partner operator'],
  ['spv_user', 'SPV User', 'Special Purpose Vehicle operator'],
  ['dashboard_viewer', 'Dashboard Viewer', 'Read-only dashboard access'],
  ['approving_authority', 'Approving Authority', 'Content/approval authority'],
]

const PERMISSIONS = [
  ['user.read', 'View users'],
  ['user.write', 'Create/update/deactivate users'],
  ['role.read', 'View roles and permissions'],
  ['role.write', 'Create/update/delete roles'],
]

async function bootstrapAdmin() {
  const username = process.env.INITIAL_ADMIN_USERNAME?.trim()
  const fullName = process.env.INITIAL_ADMIN_NAME?.trim()
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim() || null
  const password = process.env.INITIAL_ADMIN_PASSWORD

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.')
  }

  if (!username || !fullName || !password) {
    throw new Error(
      'Set INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_NAME and INITIAL_ADMIN_PASSWORD in Backend/.env.'
    )
  }

  if (password.length < 12) {
    throw new Error('Use a strong password with at least 12 characters.')
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address.')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Prevent accidentally creating another bootstrap administrator.
    const existingAdmin = await client.query(`
      SELECT u.id
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'super_admin'
      LIMIT 1
    `)

    if (existingAdmin.rowCount > 0) {
      throw new Error(
        'A Super Administrator already exists. Use the official account-management interface.'
      )
    }

    // Create or update the ten system roles.
    const roleIds = {}

    for (const [code, name, description] of ROLES) {
      const result = await client.query(
        `INSERT INTO roles (code, name, description, is_system)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (code)
         DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           is_system = TRUE
         RETURNING id`,
        [code, name, description]
      )

      roleIds[code] = result.rows[0].id
    }

    // Create the initial permission records.
    const permissionIds = []

    for (const [code, name] of PERMISSIONS) {
      const result = await client.query(
        `INSERT INTO permissions (code, name)
         VALUES ($1, $2)
         ON CONFLICT (code)
         DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [code, name]
      )

      permissionIds.push(result.rows[0].id)
    }

    // Give the Super Administrator all four initial permissions.
    for (const permissionId of permissionIds) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [roleIds.super_admin, permissionId]
      )
    }

    // Hash the password using the backend's bcryptjs dependency.
    const passwordHash = await bcrypt.hash(password, 12)

    // Create the initial administrator.
    const userResult = await client.query(
      `INSERT INTO users (
         username,
         password_hash,
         full_name,
         email,
         status,
         failed_login_attempts,
         updated_at
       )
       VALUES ($1, $2, $3, $4, 'ACTIVE', 0, NOW())
       RETURNING id, username`,
      [username, passwordHash, fullName, email]
    )

    const user = userResult.rows[0]

    // Assign the Super Administrator role.
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)`,
      [user.id, roleIds.super_admin]
    )

    await client.query('COMMIT')

    console.log('\n================================')
    console.log(' PM SETU ADMIN CREATED')
    console.log('================================')
    console.log('Username:', user.username)
    console.log('User ID:', user.id)
    console.log('Role: Super Administrator')
    console.log('Status: ACTIVE')
    console.log('================================')
    console.log('You can now sign in to PM SETU.')
    console.log('================================\n')

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

bootstrapAdmin().catch(async (error) => {
  console.error('\nBootstrap failed:', error.message)
  await pool.end()
  process.exitCode = 1
})
