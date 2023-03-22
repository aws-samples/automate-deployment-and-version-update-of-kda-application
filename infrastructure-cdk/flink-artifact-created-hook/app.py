import logging
import os
import time

import boto3
from botocore.exceptions import ClientError

log = logging.getLogger(__name__)
log.setLevel(logging.INFO)

BUCKET_NAME = os.environ['BUCKET_NAME']
FILE_NAME = os.environ['FILE_NAME']

s3 = boto3.client('s3')


def on_create(event):
    log.info("Got Create for %s", event)

    while True:
        try:
            log.info(f"Try to fetch object '{FILE_NAME}' from bucket '{BUCKET_NAME}'")
            response = s3.head_object(Bucket=BUCKET_NAME, Key=FILE_NAME)

            if response['ResponseMetadata']['HTTPStatusCode'] == 200:
                log.info(f"Found the object with response: {response}")
                return {'PhysicalResourceId': f"Flink-Application-Created-In-{BUCKET_NAME}/{FILE_NAME}"}

            else:
                log.error(f"Invalid response from S3: {response}")
                raise ValueError("Invalid response from S3: ", response)

        except ClientError as e:
            if e.response['ResponseMetadata']['HTTPStatusCode'] == 404:
                log.info(f"Not found the object yet with response: {e}")
                time.sleep(30)

            else:
                log.error(f"Invalid state from S3: {e}")
                raise ValueError("Invalid state from S3: ", e)


def on_update(event):
    log.info("Got Update for %s", event["PhysicalResourceId"])
    # If the update resulted in a new resource being created, return an id for the new resource.
    # CloudFormation will send a delete event with the old id when stack update completes


def on_delete(event):
    log.info("Got Delete for %s", event["PhysicalResourceId"])
    # Delete never returns anything. Should not fail if the underlying resources are already deleted.
    # Desired state.


def on_event(event, context):
    log.info("Received event: %s", event)

    request_type = event['RequestType']
    if request_type == 'Create':
        return on_create(event)
    if request_type == 'Update':
        return on_update(event)
    if request_type == 'Delete':
        return on_delete(event)

    raise Exception("Invalid request type: %s" % request_type)
