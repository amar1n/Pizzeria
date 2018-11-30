'use strict';

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

/*
 order : {
  orderId: String,
  name: String,
  address: String,
  pizzas: Array of Strings,
  delivery_status: READY_FOR_DELIVERY / DELIVERED
  timestamp: timestamp
}
*/

module.exports.saveProcessedOrder = order => {
    console.log('orderMetadataManager.saveProcessedOrder fue llamado');

    order.delivery_status = 'READY_FOR_DELIVERY';

    const params = {
        TableName: process.env.PROCESSED_ORDERS_TABLE_NAME,
        Item: order
    };

    return dynamo.put(params).promise();
};

module.exports.deliverOrder = orderId => {
    console.log('orderMetadataManager.deliverOrder fue llamado');

    const params = {
        TableName: process.env.PROCESSED_ORDERS_TABLE_NAME,
        Key: {
            orderId
        },
        ConditionExpression: 'attribute_exists(orderId)',
        UpdateExpression: 'set delivery_status = :v',
        ExpressionAttributeValues: {
            ':v': 'DELIVERED'
        },
        ReturnValues: 'ALL_NEW'
    };

    return dynamo
        .update(params)
        .promise()
        .then(response => {
            return response.Attributes;
        });
};

module.exports.getOrderStatus = orderId => {
    console.log('orderMetadataManager.getOrderStatus fue llamado');

    var params = {
        TableName: process.env.PROCESSED_ORDERS_TABLE_NAME,
        Key: { orderId: orderId }
    };

    return dynamo
        .get(params)
        .promise()
        .then(response => {
            return response.Item;
        });
};