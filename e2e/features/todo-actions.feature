Feature: Act on TODOs
  Tasks can be completed from the list, and their source notes can be opened.

  Background:
    Given the TODO view is open

  Scenario: Completing a task updates its Markdown note and removes it from the list
    When I open the "Inbox" list
    And I mark "Inbox task" as complete
    Then "Tasks.md" should contain the completed task "Inbox task"
    And I should not see "Inbox task"

  Scenario: Opening a task reveals its source note
    When I open the "Inbox" list
    And I open the source note for "Inbox task"
    Then the active note should be "Tasks.md"

  Scenario: Opening a source note keeps the current note open when configured
    Given another note is open
    When I open the "Inbox" list
    And I open the source note for "Inbox task"
    Then both "Home.md" and "Tasks.md" should remain open

  Scenario: Opening a source note replaces the current note when configured
    Given opening files in a new leaf is disabled
    And another note is open
    When I open the "Inbox" list
    And I open the source note for "Inbox task"
    Then the active note should be "Tasks.md"
    And "Home.md" should not remain open

  Scenario: The configured date format is used for scheduled dates
    Given the date display format is "dd LLL yyyy"
    When I open the "Scheduled" list
    Then the due date for "Custom display format task" should be "01 Jan 2999"

  Scenario: The configured date tag format is recognized
    Given the date tag format is "due:%date%"
    And I open the "Scheduled" list
    Then I should see "Custom tag task"
    And the due date for "Custom tag task" should be "2999-07-04"
