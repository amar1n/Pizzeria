'use strict';

const uuidv1 = require('uuid/v1');
const AWS = require('aws-sdk');

var sqs = new AWS.SQS({ region: process.env.REGION });
const QUEUE_URL = process.env.PENDING_ORDERS_QUEUE_URL;

const orderMetadataManager = require('./orderMetadataManager');

module.exports.makeOrder = (event, context, callback) => {
  console.log('makeOrder fue llamado!!!');

  const orderId = uuidv1();

  const params = {
    MessageBody: JSON.stringify({ orderId: orderId }),
    QueueUrl: QUEUE_URL
  };

  sqs.sendMessage(params, function (err, data) {
    if (err) {
      sendResponse(500, err, callback);
    } else {
      const message = {
        orderId: orderId,
        messageId: data.MessageId
      };
      sendResponse(200, message, callback);
    }
  });
};

module.exports.processOrder = (event, context, callback) => {
  console.log('processOrder fue llamado!!!');

  const order = JSON.parse(event.Records[0].body);

  orderMetadataManager
    .saveProcessedOrder(order)
    .then(data => {
      sendResponse(200, data, callback);
    })
    .catch(error => {
      sendResponse(500, error, callback);
    });
};

module.exports.deliverOrder = (event, context, callback) => {
  console.log('deliverOrder fue llamado!!!');

  const record = event.Records[0];
  if (record.eventName === 'INSERT') {
    console.log('deliverOrder');

    const orderId = record.dynamodb.Keys.orderId.S;

    orderMetadataManager
      .deliverOrder(orderId)
      .then(data => {
        sendResponse(200, data, callback);
      })
      .catch(error => {
        sendResponse(500, error, callback);
      });
  } else {
    sendResponse(200, 'is not a new record', callback);
  }
}

module.exports.getOrderStatus = (event, context, callback) => {
  console.log('getOrderStatus fue llamado!!!');

  const orderId = event.pathParameters && event.pathParameters.orderId;
  if (orderId !== null) {
    orderMetadataManager
      .getOrderStatus(orderId)
      .then(data => {
        if (data === undefined) {
          const message = {
            orderId: orderId,
            message: "Order not found!"
          };
          sendResponse(404, message, callback);
        }

        const message = {
          orderId: orderId,
          status: data.delivery_status
        };
        sendResponse(200, message, callback);
      })
      .catch(error => {
        sendResponse(500, error, callback);
      });
  } else {
    sendResponse(400, 'Missing orderId', callback);
  }

}

function sendResponse(statusCode, message, callback) {
  const response = {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
  callback(null, response);
}