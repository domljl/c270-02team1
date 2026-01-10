# Test Suite Documentation

## Overview
This test suite ensures the reliability and correctness of the Inventory Management API. All tests are automatically run on every push to GitHub using GitHub Actions.

## Test Structure

### 1. API Tests (`tests/items.test.js`)
Comprehensive tests for all API endpoints:

#### Health Check
- ✅ Verifies `/health` endpoint returns status

#### GET /items
- ✅ Returns empty array when no items exist
- ✅ Returns all items ordered by ID (newest first)
- ✅ Returns correct item structure (id, name, sku, quantity)

#### POST /items
- ✅ Creates items successfully with valid data
- ✅ Enforces unique SKU constraint
- ✅ Validates required fields (name, sku, quantity)
- ✅ Validates quantity is non-negative integer
- ✅ Allows quantity of zero
- ✅ Handles empty request body

#### POST /items/:id/adjust
- ✅ Increases quantity with positive delta
- ✅ Decreases quantity with negative delta
- ✅ Prevents quantity from going below zero
- ✅ Allows adjustment to exactly zero
- ✅ Returns 404 for non-existent items
- ✅ Validates delta is non-zero integer
- ✅ Validates ID parameter

#### Integration Workflows
- ✅ Complete CRUD workflow
- ✅ Multiple items managed independently

### 2. Database Tests (`tests/db.test.js`)
Tests for database layer functionality:

#### Database Creation
- ✅ Creates in-memory database successfully
- ✅ Creates items table with correct schema
- ✅ Enforces unique constraint on SKU
- ✅ Enforces non-negative quantity constraint
- ✅ Allows quantity of zero
- ✅ Auto-generates created_at timestamp
- ✅ Enables WAL mode

#### Environment Configuration
- ✅ Uses DB_FILE environment variable
- ✅ Uses default path when not set

#### Data Persistence
- ✅ Persists data across connections

### 3. Frontend Tests (`tests/frontend.test.js`)
Tests for frontend JavaScript functionality:

#### UI Components
- ✅ Status messages display correctly
- ✅ Price formatting handles various inputs
- ✅ Renders empty state when no items
- ✅ Creates rows for each item
- ✅ Handles missing item properties

#### API Integration
- ✅ Fetches from /items endpoint
- ✅ Handles API errors gracefully
- ✅ Handles network errors
- ✅ Normalizes API response data

#### User Interactions
- ✅ Edit button shows warning
- ✅ Delete button shows warning

#### Sample Data
- ✅ Sample data structure validation

### 4. Static File Tests (`tests/static.test.js`)
Tests for static file serving:

- ✅ Serves index.html (homepage)
- ✅ Serves add-item.html
- ✅ Serves styles.css
- ✅ Serves main.js

### 5. End-to-End Tests (`tests/e2e.test.js`)
Comprehensive workflow tests:

#### Complete Workflows
- ✅ Full lifecycle: health, create, list, adjust
- ✅ Stock management: prevent overselling
- ✅ Duplicate SKU prevention
- ✅ Bulk operations and data integrity

#### Error Handling
- ✅ Recovers from validation errors
- ✅ Handles invalid IDs gracefully
- ✅ Handles malformed requests

#### Static File Serving
- ✅ Serves all required frontend files
- ✅ Returns 404 for non-existent files

#### API and Frontend Integration
- ✅ API provides data in expected format

#### Concurrent Operations
- ✅ Multiple simultaneous item creations
- ✅ Multiple adjustments to same item

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run tests with detailed output
```bash
npm run test:verbose
```

## Coverage Requirements

The test suite enforces a minimum of 80% coverage for:
- Branches
- Functions
- Lines
- Statements

Coverage reports are generated in the `coverage/` directory.

## Continuous Integration

### GitHub Actions Workflow
The CI pipeline runs on every push and pull request, executing:

1. **Test Job** (Matrix: Node 18, 20, 22)
   - Installs dependencies
   - Runs all tests
   - Generates coverage reports
   - Uploads coverage to Codecov

2. **Lint Job**
   - Checks for syntax errors in source files

3. **Build Job**
   - Builds Docker image
   - Tests Docker container health

4. **Security Job**
   - Runs npm audit for vulnerabilities
   - Checks for outdated dependencies

### Workflow Triggers
- Push to `main` branch
- Pull requests to any branch
- Manual workflow dispatch

## Test Best Practices

1. **Isolation**: Each test uses an in-memory database
2. **Independence**: Tests don't depend on each other
3. **Clarity**: Descriptive test names explain what's being tested
4. **Coverage**: All features have positive and negative test cases
5. **Edge Cases**: Tests cover boundary conditions

## Adding New Tests

When adding new features:

1. Add unit tests in the appropriate test file
2. Add integration tests in `e2e.test.js`
3. Ensure tests pass locally before pushing
4. Verify CI pipeline passes on GitHub

## Troubleshooting

### Tests fail locally
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Tests fail in CI but pass locally
- Check Node version matches CI (Node 20 recommended)
- Ensure all dependencies are in package.json
- Check for environment-specific code

### Coverage below threshold
```bash
# Generate detailed coverage report
npm run test:coverage
# Open coverage/lcov-report/index.html in browser
```

## Test Maintenance

- Review and update tests when features change
- Keep tests fast by using in-memory databases
- Maintain good test documentation
- Regular dependency updates for test frameworks
