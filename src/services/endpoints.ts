export interface EndPointApi {
  // Products
  products: string;
  productCreate: string;
  productUpdate: string;
  productDelete: string;
  productExport: string;

  // Statuses
  statuses: string;
  statusCreate: string;
  statusUpdate: string;
  statusDelete: string;
  statusExport: string;

  // Return Order Types
  returnOrderTypes: string;
  returnOrderTypeCreate: string;
  returnOrderTypeUpdate: string;
  returnOrderTypeDelete: string;
  returnOrderTypeExport: string;

  // Reason to Calls
  reasonToCalls: string;
  reasonToCallCreate: string;
  reasonToCallUpdate: string;
  reasonToCallDelete: string;
  reasonToCallExport: string;

  // Roles
  roles: string;
  roleCreate: string;
  roleUpdate: string;
  roleDelete: string;
  roleExport: string;

  // Users
  users: string;
  userCreate: string;
  userUpdate: string;
  userDelete: string;
  userExport: string;

  // Auth
  authLogin: string;
  authForgotPassword: string;
  authResetPassword: string;

  // Teams
  teams: string;
  teamCreate: string;
  teamUpdate: string;
  teamDelete: string;
  teamExport: string;

  // Couriers
  couriers: string;
  courierCreate: string;
  courierUpdate: string;
  courierDelete: string;

  // Upload
  upload: string;

  // Leads
  leads: string;
  leadCreate: string;
  leadUpdate: string;
  leadDelete: string;
  leadExport: string;

  // Orders
  orders: string;
  orderCreate: string;
  orderUpdate: string;
  orderDelete: string;
  orderExport: string;

  // Return Orders (adding if missing)
  returnOrders: string;
  returnOrderExport: string;
  staffReturnStatsExport: string;

  // Deliveries
  deliveries: string;
  deliveryCreate: string;
  deliveryUpdate: string;
  deliveryDelete: string;
  deliveryExport: string;

  // Activity Logs
  activityLogs: string;

  // Dashboard
  dashboardStats: string;
}

const endPointApi: EndPointApi = {
  // Products
  products: 'products',
  productCreate: 'products',
  productUpdate: 'products',
  productDelete: 'products',
  productExport: 'products/export',

  // Statuses
  statuses: 'statuses',
  statusCreate: 'statuses',
  statusUpdate: 'statuses',
  statusDelete: 'statuses',
  statusExport: 'statuses/export',

  // Return Order Types
  returnOrderTypes: 'return-order-types',
  returnOrderTypeCreate: 'return-order-types',
  returnOrderTypeUpdate: 'return-order-types',
  returnOrderTypeDelete: 'return-order-types',
  returnOrderTypeExport: 'return-order-types/export',

  // Reason to Calls
  reasonToCalls: 'reason-to-calls',
  reasonToCallCreate: 'reason-to-calls',
  reasonToCallUpdate: 'reason-to-calls',
  reasonToCallDelete: 'reason-to-calls',
  reasonToCallExport: 'reason-to-calls/export',

  // Roles
  roles: 'roles',
  roleCreate: 'roles',
  roleUpdate: 'roles',
  roleDelete: 'roles',
  roleExport: 'roles/export',

  // Users
  users: 'users',
  userCreate: 'users',
  userUpdate: 'users',
  userDelete: 'users',
  userExport: 'users/export',

  // Auth
  authLogin: 'auth/login',
  authForgotPassword: 'auth/forgot-password',
  authResetPassword: 'auth/reset-password',

  // Teams
  teams: 'teams',
  teamCreate: 'teams',
  teamUpdate: 'teams',
  teamDelete: 'teams',
  teamExport: 'teams/export',

  // Couriers
  couriers: 'couriers',
  courierCreate: 'couriers',
  courierUpdate: 'couriers',
  courierDelete: 'couriers',

  // Upload
  upload: 'upload',

  // Leads
  leads: 'leads',
  leadCreate: 'leads',
  leadUpdate: 'leads',
  leadDelete: 'leads',
  leadExport: 'leads/export',

  // Orders
  orders: 'orders',
  orderCreate: 'orders',
  orderUpdate: 'orders',
  orderDelete: 'orders',
  orderExport: 'orders/export',

  // Return Orders
  returnOrders: 'return-orders',
  returnOrderExport: 'return-orders/export',
  staffReturnStatsExport: 'return-orders/stats/staff/export',

  // Deliveries
  deliveries: 'deliveries',
  deliveryCreate: 'deliveries',
  deliveryUpdate: 'deliveries',
  deliveryDelete: 'deliveries',
  deliveryExport: 'deliveries/export',

  // Activity Logs
  activityLogs: 'activity-logs',

  // Dashboard
  dashboardStats: 'dashboard/stats',
};

export default endPointApi;
