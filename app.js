// This output SQL is based on MySQL 8.0

const models = require('./models');

let commons = {};

if (models['*']) {
    commons = parseColumns(models['*']);
}

var sqls = [];

var primaryKeys = {};
var foreignKeys = {};

for (let tableName in models) {
    if (tableName === '*') {
        continue;
    }

    let primaryKey = null;

    let tableProperties = parseColumns(models[tableName]);
    tableProperties.columns = Object.assign({}, commons.columns, tableProperties.columns);
    tableProperties.columns = Object.values(tableProperties.columns);

    if (commons.primaryKey) {
        primaryKey = commons.primaryKey;
    }

    if (tableProperties.primaryKey) {
        primaryKey = commons.primaryKey;
    }

    if (primaryKey) {
        primaryKeys[tableName] = primaryKey;
    }

    for (let foreignKey in tableProperties.foreignKeys) {
        let row = {
            column: foreignKey,
            ref: tableProperties.foreignKeys[foreignKey],
        };

        if (!foreignKeys[foreignKey]) {
            foreignKeys[tableName] = [row];
        } else {
            foreignKeys[tableName].push(row);
        }
    }

    sqls.push(`CREATE TABLE \`${tableName}\` (\n\t${tableProperties.columns.join(',\n\t')}\n);\n`);
}

for (let tableName in foreignKeys) {
    foreignKeys[tableName].forEach(foreignKey => {
        sqls.push(`ALTER TABLE \`${tableName}\` ADD FOREIGN KEY (\`${foreignKey.column}\`) REFERENCES \`${foreignKey.ref}\`(${primaryKeys[foreignKey.ref]});`);
    });
}

function parseColumns (columnsReceived) {
    let columns = {};
    let primaryKey = null;
    let foreignKeys = {};

    for (let columnName in columnsReceived) {
        let properties = columnsReceived[columnName];

        let sqlColumn = [`\`${columnName}\``];

        let type = '';

        if (properties.type === 'string') {
            if (properties.length && properties.length <= 255) {
                type = `varchar(${properties.length})`;
            } else {
                type = 'text';
            }

            if (properties.default !== undefined) {
                type += ' DEFAULT \'' + escapeString(properties.default) + '\'';
            }
        } else if (properties.type === 'number') {
            let length = 11;

            if (properties.length) {
                length = properties.length;
            }

            type = `int(${length})`;

            if (properties.default !== undefined) {
                type += ' DEFAULT ' + properties.default;
            }
        } else if (properties.type === 'boolean') {
            type = 'tinyint(1)';

            if (typeof properties.default === 'boolean') {
                type += ' DEFAULT ' + (properties.default === true ? '1' : '0');
            } else if (typeof properties.default === 'number') {
                type += ' DEFAULT ' + properties.default;
            }
        } else if (properties.type === 'datetime') {
            type = 'datetime';

            if (properties.default !== undefined) {
                type += ' DEFAULT ' + properties.default;
            }

            if (properties.onUpdate !== undefined) {
                type += ' ON UPDATE ' + properties.onUpdate;
            }
        } else if (properties.ref !== undefined) {
            foreignKeys[columnName] = properties.ref;
            type = 'int(11)';
        } else {
            continue;
        }

        if (properties.primaryKey) {
            primaryKey = `\`${columnName}\``;
            type += ' PRIMARY KEY';
        }

        if (type) {
            sqlColumn.push(type);
        }

        columns[columnName] = sqlColumn.join(' ');
    }

    return {
        columns: columns,
        primaryKey: primaryKey,
        foreignKeys: foreignKeys,
    };
}

function escapeString (string) {
    return string.replace(/'/g, '\\\'');
}

var output = sqls.join('\n');

console.log(output);