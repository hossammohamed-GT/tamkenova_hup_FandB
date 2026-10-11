# Course category card images

The category cards use locally bundled stock photos so the catalog does not depend on third-party image hosts at runtime. The SQL seed stores the corresponding `/assets/course-categories/...` paths in `course_categories.image_url`.

| Category | Local asset | Source |
| --- | --- | --- |
| Business & Professional Skills | `business-professional-skills.jpg` | [Pexels](https://www.pexels.com/photo/professional-business-meeting-in-modern-office-36733315/) |
| Technology & Innovation | `technology-innovation.jpg` | [Pexels](https://www.pexels.com/photo/workplace-with-modern-laptop-with-program-code-on-screen-3888151/) |
| Arts, Design & Media | `arts-design-media.jpg` | [Pexels artwork search](https://www.pexels.com/search/artwork/) |
| Wellbeing | `wellbeing.jpg` | [Pexels meditation in nature search](https://www.pexels.com/search/meditation%20nature/) |
| Lifestyle | `lifestyle.jpg` | [Pexels home cooking search](https://www.pexels.com/search/cooking%20at%20home/) |
| Education & Academics | `education-academics.jpg` | [Pexels study search](https://www.pexels.com/search/study/) |
| Family & Relationships | `family-relationships.jpg` | [Pexels family conversation search](https://www.pexels.com/search/family%20talking/) |
| Languages | `languages.jpg` | [Pexels students talking search](https://www.pexels.com/search/students%20talking) |
| Soft Skills | `soft-skills.jpg` | [Pexels team meeting search](https://www.pexels.com/search/team%20meeting/) |

Replace a category image by updating the asset and that category's `image_url`. A custom `image_url` already present in the database is preserved by the idempotent SQL seed.
