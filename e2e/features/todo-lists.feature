Feature: Review TODOs by category
  The TODO view gathers outstanding tasks across a vault and sorts them into lists.

  Background:
    Given the TODO view is open

  Scenario Outline: Tasks appear in the list matching their date and tags
    When I open the "<list>" list
    Then I should see "<included task>"
    And I should not see "<excluded task>"

    Examples:
      | list          | included task          | excluded task |
      | Today         | Overdue task           | Earlier scheduled task |
      | Scheduled     | Earlier scheduled task | Overdue task  |
      | Inbox         | Inbox task             | Someday task  |
      | Someday/Maybe | Someday task           | Inbox task    |

  Scenario: A task due today appears in Today with its date shown
    Given my vault has a task called "Pay rent" due today
    When I open the "Today" list
    Then I should see "Pay rent"
    And the due date for "Pay rent" should be today's date

  Scenario: Future scheduled tasks are ordered by due date
    When I open the "Scheduled" list
    Then the tasks should appear in this order:
      | Earlier scheduled task |
      | Later scheduled task   |

  Scenario: The someday tag takes precedence over a future due date
    When I open the "Someday/Maybe" list
    Then I should see "Someday tasks ignore dates"
    When I open the "Scheduled" list
    Then I should not see "Someday tasks ignore dates"

  Scenario: Completed tasks are not included in the lists
    When I open the "Inbox" list
    Then I should see "Inbox task"
    And I should not see "Already completed task"

  Scenario: Markdown tasks using asterisks are included
    When I open the "Inbox" list
    Then I should see "Asterisk task"

  Scenario: A daily note task inherits the date in its note name
    When I open the "Today" list
    Then I should see "Daily note task"
    And the due date for "Daily note task" should be "2000-05-25"
