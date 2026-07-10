<?php

/**
 * PermissionController.php
 * Manages role permissions with multitenancy support
 * 
 * Business Rules:
 * - Super Admin (pae_id = NULL): Full CRUD on roles + global permissions
 * - PAE Admin (pae_id specific): Can only assign/deny permissions for their PAE
 * - Permissions are PAE-specific (multitenancy)
 */

class PermissionController
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    /**
     * GET /api/permissions/roles
     * List all roles (Super Admin) or view-only roles (PAE Admin)
     */
    public function getRoles($user)
    {
        try {
            $stmt = $this->db->prepare("SELECT id, name, description FROM roles ORDER BY id");
            $stmt->execute();
            $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $roles,
                'can_modify_roles' => $user['pae_id'] === null // Only Super Admin can modify roles
            ];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error al obtener roles', 'error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/permissions/modules
     * Get all modules grouped by module_groups
     */
    public function getModules()
    {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    mg.id as group_id,
                    mg.name as group_name,
                    mg.icon as group_icon,
                    m.id as module_id,
                    m.name as module_name,
                    m.description as module_description,
                    m.route_key
                FROM module_groups mg
                LEFT JOIN modules m ON mg.id = m.group_id
                ORDER BY mg.order_index, m.id
            ");
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Group modules by group
            $grouped = [];
            foreach ($results as $row) {
                $groupId = $row['group_id'];
                if (!isset($grouped[$groupId])) {
                    $grouped[$groupId] = [
                        'id' => $row['group_id'],
                        'name' => $row['group_name'],
                        'icon' => $row['group_icon'],
                        'modules' => []
                    ];
                }
                if ($row['module_id']) {
                    $grouped[$groupId]['modules'][] = [
                        'id' => $row['module_id'],
                        'name' => $row['module_name'],
                        'description' => $row['module_description'],
                        'route_key' => $row['route_key']
                    ];
                }
            }

            return [
                'success' => true,
                'data' => array_values($grouped)
            ];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error al obtener módulos', 'error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/permissions/matrix/{role_id}
     * Get permission matrix for a specific role
     * If user is PAE Admin, only show permissions for their PAE
     */
    public function getPermissionMatrix($roleId, $user)
    {
        try {
            $paeId = $user['pae_id'];

            // Build query based on user type
            if ($paeId === null) {
                // Super Admin: Get global permissions (pae_id = NULL)
                $sql = "
                    SELECT 
                        m.id as module_id,
                        COALESCE(mp.can_create, 0) as can_create,
                        COALESCE(mp.can_read, 0) as can_read,
                        COALESCE(mp.can_update, 0) as can_update,
                        COALESCE(mp.can_delete, 0) as can_delete
                    FROM modules m
                    LEFT JOIN module_permissions mp 
                        ON m.id = mp.module_id 
                        AND mp.role_id = :role_id 
                        AND mp.pae_id IS NULL
                    ORDER BY m.id
                ";
                $params = [':role_id' => $roleId];
            } else {
                // PAE Admin: Get permissions for their PAE
                $sql = "
                    SELECT 
                        m.id as module_id,
                        COALESCE(mp.can_create, 0) as can_create,
                        COALESCE(mp.can_read, 0) as can_read,
                        COALESCE(mp.can_update, 0) as can_update,
                        COALESCE(mp.can_delete, 0) as can_delete
                    FROM modules m
                    LEFT JOIN module_permissions mp 
                        ON m.id = mp.module_id 
                        AND mp.role_id = :role_id 
                        AND mp.pae_id = :pae_id
                    ORDER BY m.id
                ";
                $params = [':role_id' => $roleId, ':pae_id' => $paeId];
            }

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $permissions,
                'pae_id' => $paeId,
                'is_global' => $paeId === null
            ];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error al obtener permisos', 'error' => $e->getMessage()];
        }
    }

    /**
     * PUT /api/permissions/update
     * Update permissions for a role
     * Super Admin: Updates global permissions (pae_id = NULL)
     * PAE Admin: Updates permissions for their PAE only
     */
    public function updatePermissions($data, $user)
    {
        try {
            $roleId = $data['role_id'] ?? null;
            $moduleId = $data['module_id'] ?? null;
            $permissions = $data['permissions'] ?? [];

            if (!$roleId || !$moduleId) {
                return ['success' => false, 'message' => 'role_id y module_id son requeridos'];
            }

            // Validate permissions structure
            $canCreate = isset($permissions['can_create']) ? (int)$permissions['can_create'] : 0;
            $canRead = isset($permissions['can_read']) ? (int)$permissions['can_read'] : 0;
            $canUpdate = isset($permissions['can_update']) ? (int)$permissions['can_update'] : 0;
            $canDelete = isset($permissions['can_delete']) ? (int)$permissions['can_delete'] : 0;

            $paeId = $user['pae_id'];

            // Check if permission exists
            if ($paeId === null) {
                // Super Admin: Check global permission
                $checkSql = "SELECT id FROM module_permissions 
                            WHERE role_id = :role_id 
                            AND module_id = :module_id 
                            AND pae_id IS NULL";
                $checkParams = [':role_id' => $roleId, ':module_id' => $moduleId];
            } else {
                // PAE Admin: Check PAE-specific permission
                $checkSql = "SELECT id FROM module_permissions 
                            WHERE role_id = :role_id 
                            AND module_id = :module_id 
                            AND pae_id = :pae_id";
                $checkParams = [':role_id' => $roleId, ':module_id' => $moduleId, ':pae_id' => $paeId];
            }

            $stmt = $this->db->prepare($checkSql);
            $stmt->execute($checkParams);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Update existing permission
                $updateSql = "UPDATE module_permissions 
                             SET can_create = :can_create,
                                 can_read = :can_read,
                                 can_update = :can_update,
                                 can_delete = :can_delete
                             WHERE id = :id";
                $stmt = $this->db->prepare($updateSql);
                $stmt->execute([
                    ':can_create' => $canCreate,
                    ':can_read' => $canRead,
                    ':can_update' => $canUpdate,
                    ':can_delete' => $canDelete,
                    ':id' => $existing['id']
                ]);
            } else {
                // Insert new permission
                $insertSql = "INSERT INTO module_permissions 
                             (role_id, pae_id, module_id, can_create, can_read, can_update, can_delete)
                             VALUES (:role_id, :pae_id, :module_id, :can_create, :can_read, :can_update, :can_delete)";
                $stmt = $this->db->prepare($insertSql);
                $stmt->execute([
                    ':role_id' => $roleId,
                    ':pae_id' => $paeId,
                    ':module_id' => $moduleId,
                    ':can_create' => $canCreate,
                    ':can_read' => $canRead,
                    ':can_update' => $canUpdate,
                    ':can_delete' => $canDelete
                ]);
            }

            return [
                'success' => true,
                'message' => 'Permisos actualizados exitosamente'
            ];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error al actualizar permisos', 'error' => $e->getMessage()];
        }
    }

    /**
     * POST /api/roles (Super Admin only)
     * Create a new role
     */
    public function createRole($data, $user)
    {
        try {
            // Only Super Admin can create roles
            if ($user['pae_id'] !== null) {
                return ['success' => false, 'message' => 'No tienes permisos para crear roles'];
            }

            $name = $data['name'] ?? null;
            $description = $data['description'] ?? null;

            if (!$name) {
                return ['success' => false, 'message' => 'El nombre del rol es requerido'];
            }

            $stmt = $this->db->prepare("INSERT INTO roles (name, description) VALUES (:name, :description)");
            $stmt->execute([':name' => $name, ':description' => $description]);

            return [
                'success' => true,
                'message' => 'Rol creado exitosamente',
                'data' => ['id' => $this->db->lastInsertId()]
            ];
        } catch (Exception $e) {
            if ($e->getCode() == 23000) {
                return ['success' => false, 'message' => 'El nombre del rol ya existe'];
            }
            return ['success' => false, 'message' => 'Error al crear rol', 'error' => $e->getMessage()];
        }
    }

    /**
     * DELETE /api/roles/{id} (Super Admin only)
     * Delete a role
     */
    public function deleteRole($roleId, $user)
    {
        try {
            // Only Super Admin can delete roles
            if ($user['pae_id'] !== null) {
                return ['success' => false, 'message' => 'No tienes permisos para eliminar roles'];
            }

            // Prevent deletion of SUPER_ADMIN role
            if ($roleId == 1) {
                return ['success' => false, 'message' => 'No se puede eliminar el rol de Super Admin'];
            }

            // Check if role has users
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM users WHERE role_id = :role_id");
            $stmt->execute([':role_id' => $roleId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result['count'] > 0) {
                return ['success' => false, 'message' => 'No se puede eliminar el rol porque tiene usuarios asignados'];
            }

            $stmt = $this->db->prepare("DELETE FROM roles WHERE id = :id");
            $stmt->execute([':id' => $roleId]);

            return [
                'success' => true,
                'message' => 'Rol eliminado exitosamente'
            ];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error al eliminar rol', 'error' => $e->getMessage()];
        }
    }
}
