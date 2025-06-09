# Communication Setup

The communication module in the NR Broker backend updates users about events that occur with collection objects that they are connected to.

## How it works

Users are connected to collection objects in NR Broker's graph. Any collection object can act as a source of a communication event that is then sent out to upstream users with (optionally) the relevant roles on their team.

As an example, a deployment might trigger an event on that service that moves up through the graph to find tester role users so that they can begin testing.

Communication events are all queued and then processed by the node that pulls the event off the queue.

## Modifying Templates

Each event uses [EJS](https://ejs.co) templates to render the text and subject of the communication. These templates can be modified to suit your needs.

## Email Setup

If the 'NOTIFICATION_EMAIL_*' environment variables are setup, the communication email service will attempt to send updates using SMTP.

See: [Environment Variables](/dev_env_vars.md)

## Default Setup

If no communication service is avialable, events on collection objects that would have been sent to the user at output to standard out using the dummy service.
