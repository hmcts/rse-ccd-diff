const { generateFileReport } = require('./markdown');

const [_, __, arg1, arg2] = process.argv;
const masterDir = __dirname + '/' + arg1 + '/';
const branchDir = __dirname + '/' + arg2 + '/';

const fileFieldId = {
  'AuthorisationCaseState.json': field => `${field.CaseStateID}:${field.UserRole}`,
  'AuthorisationCaseType.json': field => field.UserRole,
  'CaseField.json': field => field.ID,
  'CaseRoles.json': field => field.ID,
  'SearchInputFields.json': field => field.CaseFieldID,
  'SearchResultFields.json': field => field.CaseFieldID,
  'State.json': field => field.ID,
  'WorkBasketInputFields.json': field => field.CaseFieldID,
  'WorkBasketResultFields.json': field => field.CaseFieldID,
  'AuthorisationCaseEvent/AuthorisationCaseEvent.json': field => `${field.CaseEventID}:${field.UserRole}`
}

const blacklistedKeys = ['LiveFrom', 'SecurityClassification', 'CaseTypeID'];

const removeBlacklistedKeys = field => {
  return Object.fromEntries(
    Object.entries(field).filter(([key]) => !blacklistedKeys.includes(key))
  );
}

const groupBy = (values, getId) => values.reduce((result, value) => {
  result[getId(value)] = value;

  return result;
}, {});

const hasFieldChanged = (obj1, obj2) => Object
  .keys(obj1)
  .some(key => obj1[key] !== obj2[key]);

let output = '';

for (const [file, getFieldId] of Object.entries(fileFieldId)) {
  const masterContent = require(masterDir + file).map(removeBlacklistedKeys);
  const branchContent = require(branchDir + file).map(removeBlacklistedKeys);

  const masterFields = groupBy(masterContent, getFieldId);
  const branchFields = groupBy(branchContent, getFieldId);
  const masterFieldKeys = Object.keys(masterFields);
  const branchFieldKeys = Object.keys(branchFields);

  const additions = branchFieldKeys.filter(key => !masterFields[key]).map(key => branchFields[key]);
  const removals = masterFieldKeys.filter(key => !branchFields[key]).map(key => masterFields[key]);
  const changes = masterFieldKeys
    .filter(key => branchFields[key] && hasFieldChanged(masterFields[key], branchFields[key]))
    .map(key => ({ oldValue: masterFields[key], newValue: branchFields[key]}));

  output += generateFileReport(file, { additions, changes, removals });
}

console.log(output);

