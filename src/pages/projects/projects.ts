import { getRepositoryDetails } from "../../utils";

export interface Project {
  name: string;
  demoLink: string;
  githubLink: string;
  tags?: string[],
  description?: string;
  postLink?: string;
  demoLinkRel?: string;
  [key: string]: any;
}

export const projects: Project[] = [
  {
    name: 'MVVM News Application',
    description: 'Built with Android with Kotlin, Coroutines, Flow, Dagger 2, Retrofit, ViewModel using MVVM pattern.',
    githubLink: 'https://github.com/aravindrajpalani/MVVMNewsApplication',
    tags: ['Project']
  },
  {
    name: 'Compose Recipe App',
    description: 'Built with Jetpack Compose, Coroutines, Flow, Hilt, Retrofit using MVVM Architecture pattern.',
    githubLink: 'https://github.com/aravindrajpalani/ComposeRecipeApp',
    tags: ['Project']
  }
]
