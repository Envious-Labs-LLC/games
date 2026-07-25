import movement from "../content/design/movement.json";
import course from "../content/design/course.json";
import { courseSchema, movementSchema } from "../src/content/schemas";

movementSchema.parse(movement);
courseSchema.parse(course);
console.log("validate:content — movement and course data are valid.");
