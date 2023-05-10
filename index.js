const fs = require('fs');
const YAML = require('yaml');

// Read the YAML Swagger file
const swaggerFilePath = './example.yaml';
const swaggerFile = fs.readFileSync(swaggerFilePath, 'utf8');
const swaggerData = YAML.parse(swaggerFile);

// Extract API paths
const apiPaths = Object.keys(swaggerData.paths);

const httpResps = ['BadRequestResponse', 'UnauthorizedAccessResponse', 'InternalServerErrorResponse'];
const commonData = {
	openapi: swaggerData.openapi,
	info: swaggerData.info,
	servers: swaggerData.servers,
	paths: {},
	components: {
		responses: {},
		schemas: { Error: swaggerData.components.schemas.Error },
		securitySchemes: swaggerData.components.securitySchemes,
	},
	security: swaggerData.security,
};

// Generate individual Swagger files for each path
apiPaths.forEach((apiPath) => {
	// Create a new Swagger data
	const individualSwaggerData = {
		...commonData,
		paths: { [apiPath]: swaggerData.paths[apiPath] },
		components: {
			responses: {},
			schemas: { Error: swaggerData.components.schemas.Error },
			securitySchemes: swaggerData.components.securitySchemes,
		},
	};

	// Add required schemas
	const apiDef = swaggerData.paths[apiPath];
	const requiredSchemas = getRequiredSchemas(apiDef);
	if (requiredSchemas.length > 0) {
		requiredSchemas.forEach((schemaName) => {
			if (httpResps.includes(schemaName))
				individualSwaggerData.components.responses[schemaName] = swaggerData.components.responses[schemaName];
			else individualSwaggerData.components.schemas[schemaName] = swaggerData.components.schemas[schemaName];
		});
	}

	// Export the individual Swagger file
	const individualSwaggerFilePath = `./generated${apiPath}.yaml`;
	const individualSwaggerFile = YAML.stringify(individualSwaggerData);
	fs.mkdirSync('./generated', { recursive: true });
	fs.writeFileSync(individualSwaggerFilePath, individualSwaggerFile, 'utf8');
	console.log(`Generated Swagger file for API path: ${apiPath}`);
});

// Function to retrieve required schemas for a given object
function getRequiredSchemas(obj) {
	const requiredSchemas = [];

	if (!obj) return requiredSchemas;

	const schemaRefs = findSchemaRefs(obj);

	schemaRefs.forEach((ref) => {
		const nestedSchemas = getRequiredSchemas(swaggerData.components.schemas[getSchemaNameFromRef(ref)]);
		requiredSchemas.push(...nestedSchemas);
		requiredSchemas.push(getSchemaNameFromRef(ref));
	});

	return [...new Set(requiredSchemas)];
}

function findSchemaRefs(obj, results = []) {
	const key = '$ref';
	if (typeof obj !== 'object' || obj === null) {
		return results;
	}

	if (key in obj) {
		results.push(obj[key]);
	}

	for (const nestedKey in obj) {
		if (typeof obj[nestedKey] === 'object' && obj[nestedKey] !== null) {
			findSchemaRefs(obj[nestedKey], results);
		}
	}

	return results;
}

// Function to extract the schema name from a $ref string
function getSchemaNameFromRef(ref) {
	const temp = ref.split('/');
	return temp[temp.length - 1];
}
