import dotenv from 'dotenv';
dotenv.config();
import { detectHierarchyCycle, canUserModifyHierarchy } from '../src/lib/services/hierarchy-service';

const dummyEmployees: any[] = [
  { id: 'E1', name: 'Indira', hierarchyLevel: 'executive', role: 'admin' },
  { id: 'E2', name: 'Ravi Kumar', hierarchyLevel: 'manager', role: 'admin', reportingTo: 'E1' },
  { id: 'E3', name: 'Vinay', hierarchyLevel: 'team_lead', role: 'admin', reportingTo: 'E2' },
  { id: 'E4', name: 'Sasi', hierarchyLevel: 'employee', role: 'employee', reportingTo: 'E3' },
  { id: 'E5', name: 'Staff Member', hierarchyLevel: 'employee', role: 'employee' }
];

console.log('Testing canUserModifyHierarchy:');
console.log('Executive can edit:', canUserModifyHierarchy(dummyEmployees[0]));
console.log('Manager can edit:', canUserModifyHierarchy(dummyEmployees[1]));
console.log('Employee can edit:', canUserModifyHierarchy(dummyEmployees[4]));

console.log('\nTesting detectHierarchyCycle:');
console.log('Self reporting check:', detectHierarchyCycle('E2', 'E2', dummyEmployees));
console.log('Circular check E1 -> E3 (E3 already reports to E2 which reports to E1):', detectHierarchyCycle('E1', 'E3', dummyEmployees));
console.log('Valid assignment E4 -> E2:', detectHierarchyCycle('E4', 'E2', dummyEmployees));
console.log('Valid assignment E5 -> null:', detectHierarchyCycle('E5', null, dummyEmployees));
