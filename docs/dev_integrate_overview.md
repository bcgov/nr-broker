# Integrating Overview

Teams use Broker by having Broker accounts associated to them. Teams that own an account can generate a JWT (token) for it that can access Broker's API. By itself, the token can make queries of the graph and fetch information about all services. In addition, NR Broker admins associate accounts with services. This allows the account token to be used to access service secrets.

Before requesting service secrets, you are required to open an intention that describes the actions you wish to perform. If the actions do not pass all business rules then information outlining how to resolve the denial is returned. There is no requirement that every action in an intention will access secrets. Some actions like the build action are used to inform about the creation of artifacts that later actions will reference. NR Broker outputs an audit of all intention activity.

Broker Accounts can be associated with multiple teams and removed from teams if that team's responsiblities change. Team owners are responsible for setting up and maintaining the user membership.

## Determining my Team's Accounts

Your teams can be viewed by opening NR Broker and clicking on the "Teams" section. You may need to change the filter to only show "My Teams." You can view your team members and, if you have permission, edit the team and its members.

If you click on a row on the "Teams" page, it will show a listing of all your accounts. You can click on the graph button to review the associated services. An account will only be able to open intentions (even if the actions do not require access to secrets) for the associated services.

## Next steps
 
* [Generate Account Token](/dev_account_token.md)
* [Intention Lifecycle](/dev_intention_lifecycle.md)
* [Using Intentions to Access Vault](/dev_intention_usage.md)
