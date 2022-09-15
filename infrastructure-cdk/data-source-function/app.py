import boto3
import os

kinesis = boto3.client("kinesis")

def lambda_handler(event, context):
    kinesis.put_record(StreamName=os.environ["STREAM_NAME"], Data=b'{"message":"This is test message from the Lambda function"}', PartitionKey="default")