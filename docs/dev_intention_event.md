# Intention Event Reference

All intentions have an event field that describes the event that caused the intention to be opened. The event object is loosely based on the Elastic Common Schema [event field](https://www.elastic.co/guide/en/ecs/current/ecs-event.html).

## Fields

| Field | Description |
| --- | --- |
| provider | This should identify the pipeline, action, etc. that uses the broker.  If this event is transient, this must uniquely identify the action. Example: provision-fluentbit-demo |
| reason | This should be a short text message outlining what triggered the usage of the broker. |
| transient | This should be set true for events triggered frequently as part of an automated process. |
| url | This should be the url to the job run or action that started this usage. |

## Transient events

If the intention being opened is a frequent and/or periodic event then examine if you should set the event object's 'transient' field to true. Transient events can be filtered out in the UI and are removed from the database after a period. Some examples of transient events:

* The deploy of an ephemeral environment
* A periodic database check
* Backup of files

While these are still audited, there is no reason to keep these events long term in the database.

