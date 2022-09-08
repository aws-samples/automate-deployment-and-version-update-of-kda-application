package com.amazon.aws.blog;

import com.amazonaws.services.kinesisanalytics.runtime.KinesisAnalyticsRuntime;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.streaming.api.datastream.DataStreamSource;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.connectors.kinesis.FlinkKinesisConsumer;

import java.util.Map;
import java.util.Properties;

public class KinesisAnalyticsApplication {

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        Map<String, Properties> applicationProperties = KinesisAnalyticsRuntime.getApplicationProperties();
        Properties kinesisReaderProperties = applicationProperties.get("KinesisReader");

        DataStreamSource<String> eventSourceStream = env.addSource(new FlinkKinesisConsumer<>(
                // read events from the Kinesis stream passed in as a parameter
                kinesisReaderProperties.getProperty("input.stream.name"),
                // deserialize events here
                new SimpleStringSchema(),
                kinesisReaderProperties
        ));

        // Print incoming messages to the console Sink
        eventSourceStream.print();
        env.execute(KinesisAnalyticsApplication.class.getName());
    }

}
