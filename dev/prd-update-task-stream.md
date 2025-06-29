# Product Requirement Document: update-task-stream Tool

## Overview
Implement a new MCP tool `update-task-stream` that allows updating the stream/channel assignment for existing Sunsama tasks.

## Research Findings

### Current Sunsama API Analysis
- Tasks have two stream-related fields:
  - `streamIds`: Array of stream IDs that the task is assigned to
  - `recommendedStreamId`: A single recommended stream ID for the task
- Existing mutations in sunsama-api library do not include an `updateTaskStream` mutation
- Tasks can be created with stream assignments using the `createTask` mutation with `streamIds` option
- Streams are accessible via `getStreamsByGroupId()` method

### Implementation Decision
Since the sunsama-api library does not expose an `updateTaskStream` mutation, we need to:
1. Create a new GraphQL mutation following the existing pattern
2. Add the mutation to our local queries/mutations
3. Implement the client method to handle stream updates
4. Follow the same patterns as other update tools (text, notes, due date, etc.)

## Requirements

### Tool Name
`update-task-stream`

### Description
"Update the stream/channel assignment for a task"

### Parameters
- `taskId` (required): The ID of the task to update
- `streamIds` (required): Array of stream IDs to assign to the task
- `recommendedStreamId` (optional): Recommended stream ID for the task
- `limitResponsePayload` (optional): Whether to limit response size (defaults to true)

### Implementation Strategy

#### 1. GraphQL Mutation
Create a new mutation following the pattern of other update mutations:
```graphql
mutation updateTaskStream($input: UpdateTaskStreamInput!) {
  updateTaskStream(input: $input) {
    ...UpdateTaskPayload
    __typename
  }
}
```

#### 2. Client Method
Add a new method `updateTaskStream` to the SunsamaClient class that:
- Validates taskId and streamIds parameters
- Calls the GraphQL mutation
- Returns the standard update result format

#### 3. MCP Tool Implementation
Follow the standard tool pattern:
- Zod schema for parameter validation
- Client resolution via `getSunsamaClient()`
- Error handling and logging
- JSON response format

### Validation Rules
- `taskId`: Required string, minimum length 1
- `streamIds`: Required array of strings, minimum 0 items (allows clearing streams)
- `recommendedStreamId`: Optional string or null
- `limitResponsePayload`: Optional boolean, defaults to true

### Response Format
JSON object with:
- `success`: Boolean indicating operation success
- `taskId`: The ID of the updated task
- `streamIds`: The new stream IDs assigned
- `recommendedStreamId`: The new recommended stream ID (if provided)
- `updatedFields`: Partial task object with updated fields (if not limited)

### Integration Points

#### Schema Addition
Add `updateTaskStreamSchema` to `src/schemas.ts` with proper validation.

#### Tool Registration
Add tool to `src/main.ts` following existing patterns with:
- Parameter extraction and validation
- Client resolution
- API call execution
- Response formatting
- Error handling and logging

#### Documentation Updates
- Update API documentation resource in main.ts
- Update README.md with new tool information
- Add comprehensive test coverage

### Testing Requirements
- Schema validation tests for all parameter combinations
- Edge cases: empty streamIds array, null recommendedStreamId
- Invalid parameter formats
- Required parameter validation

### Migration Considerations
- This is a new tool, no backward compatibility concerns
- Follows established patterns for easy adoption
- No breaking changes to existing functionality

## Success Criteria
1. Tool successfully updates task stream assignments
2. Proper validation of all parameters
3. Consistent error handling and logging
4. Comprehensive test coverage
5. Documentation properly updated
6. Follows existing code patterns and conventions