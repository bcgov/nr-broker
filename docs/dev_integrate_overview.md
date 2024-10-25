# Integrating Overview

Teams use Broker by having Broker accounts associated to them. Teams that own an account can generate a JWT (token) for it that can access Broker's API.

A Broker account token can make queries of the graph and fetch information about all services. In addition, NR Broker admins associate accounts with services. This allows the account token to be used to request delegated access to service secrets.

> A service is a software component that runs in an environment. NR Broker divides access to secrets based on service and environment.

Before requesting service secrets, you are required to open an intention that describes the actions you wish to perform. Only team members associated with a service through an account can open the intention. If the actions do not pass all business rules then information outlining how to resolve the denial is returned. NR Broker outputs an audit of all intention activity.

The purpose of some actions is to audit (like describing built artifacts) instead of gaining access to secrets. This audit information may be used to allow or deny future actions. See: [Intention Action Reference](/dev_intention_actions.md)

Broker Accounts can be associated with multiple teams and removed from teams if that team's responsiblities change. Team owners are responsible for setting up and maintaining the user membership.

## Determining my Accounts

Your teams can be viewed by opening NR Broker and clicking on the "Teams" section. You can view team members here and, if you have permission, edit the team and its members.

If you click on a row on the "Teams" page, it will show a listing of all your accounts. You can click on the graph button to review the associated services. An account will only be able to open intentions (even if the actions do not require access to secrets) for the associated services.

## Next steps

* [Generate Account Token](/dev_account_token.md)
* [Intention Lifecycle](/dev_intention_lifecycle.md)
* [Using Intentions to Access Vault](/dev_intention_usage.md)
