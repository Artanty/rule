# rule
===
v 2.
src/app/streambyter/
├── streambyter.component.ts          (main component - significantly reduced)
├── streambyter.component.html
├── streambyter.component.scss
├── services/
│   └── rule-parser.service.ts        (parsing logic for .sbr files)
├── models/
│   └── rule.model.ts                 (Rule interface and related types)
├── components/
│   ├── rule-list/
│   │   ├── rule-list.component.ts    (manages list of rules)
│   │   ├── rule-list.component.html
│   │   └── rule-list.component.scss
│   ├── rule-item/
│   │   ├── rule-item.component.ts    (single rule UI)
│   │   ├── rule-item.component.html
│   │   └── rule-item.component.scss
│   ├── trigger-section/
│   │   ├── trigger-section.component.ts
│   │   ├── trigger-section.component.html
│   │   └── trigger-section.component.scss
│   ├── output-section/
│   │   ├── output-section.component.ts
│   │   ├── output-section.component.html
│   │   └── output-section.component.scss
│   ├── consumer-mapping-selector/
│   │   ├── consumer-mapping-selector.component.ts
│   │   ├── consumer-mapping-selector.component.html
│   │   └── consumer-mapping-selector.component.scss
│   └── bulk-actions/
│       ├── bulk-actions.component.ts
│       ├── bulk-actions.component.html
│       └── bulk-actions.component.scss
├── directives/
│   └── tooltip.directive.ts
└── pipes/
    ├── hex.pipe.ts
    └── note-name.pipe.ts

===

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
