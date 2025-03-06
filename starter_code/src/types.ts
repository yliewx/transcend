export interface Route
{
    path: string;
    component: () => HTMLElement;
    title: string;
}