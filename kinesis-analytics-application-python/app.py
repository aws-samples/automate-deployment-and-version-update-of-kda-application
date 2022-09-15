from pyflink.table import EnvironmentSettings, StreamTableEnvironment
import os
import json

env_settings = (
    EnvironmentSettings.new_instance().in_streaming_mode().use_blink_planner().build()
)
table_env = StreamTableEnvironment.create(environment_settings=env_settings)

APPLICATION_PROPERTIES_FILE_PATH = "/etc/flink/application_properties.json"


def get_application_properties():
    if os.path.isfile(APPLICATION_PROPERTIES_FILE_PATH):
        with open(APPLICATION_PROPERTIES_FILE_PATH, "r") as file:
            contents = file.read()
            properties = json.loads(contents)
            return properties
    else:
        print('A file at "{}" was not found'.format(APPLICATION_PROPERTIES_FILE_PATH))


def property_map(props, property_group_id):
    for prop in props:
        if prop["PropertyGroupId"] == property_group_id:
            return prop["PropertyMap"]


def create_table(stream_name, region, stream_initpos):
    return """ CREATE TABLE input_table (
                message VARCHAR(200)
              )
              WITH (
                'connector' = 'kinesis',
                'stream' = '{1}',
                'aws.region' = '{2}',
                'scan.stream.initpos' = '{3}',
                'sink.partitioner-field-delimiter' = ';',
                'sink.producer.collection-max-count' = '100',
                'format' = 'json',
                'json.timestamp-format.standard' = 'ISO-8601'
              ) """.format(
        stream_name, region, stream_initpos
    )


def main():
    input_property_group_key = "KinesisReader"

    input_stream_key = "input.stream.name"
    input_region_key = "aws.region"
    input_starting_position_key = "flink.stream.initpos"

    # get application properties
    props = get_application_properties()

    input_property_map = property_map(props, input_property_group_key)
    input_stream = input_property_map[input_stream_key]
    input_region = input_property_map[input_region_key]
    stream_initpos = input_property_map[input_starting_position_key]

    table_env.execute_sql(
        create_table(input_stream, input_region, stream_initpos)
    )

    table_env.execute_sql("CREATE TABLE print_table WITH ('connector' = 'print') LIKE input_table (EXCLUDING ALL)")
    table_env.execute_sql("INSERT INTO print_table SELECT * from input_table")


if __name__ == "__main__":
    main()
