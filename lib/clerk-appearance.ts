// Estética Konexo (estilo cómic) para las pantallas embebidas de Clerk:
// <SignIn/> y <SignUp/> en app/sign-in y app/sign-up. Se aplica vía la prop
// `appearance` del ClerkProvider (app/layout.tsx). NO afecta el Account Portal
// alojado por Clerk: eso se configura desde el dashboard de Clerk.
//
// El tipo lo valida el ClerkProvider donde se consume (evitamos importar
// @clerk/types, que no es un paquete top-level en este árbol de deps).
//
// Colores de la paleta de marca (app/globals.css):
//   paper  #f2e8c9   panelw #fbf6e3   ink   #16110c
//   alarm  #e2493b   komic  #ffd23f   hero  #2ea8c4   verde #1f8a4c
export const konexoClerkAppearance = {
  variables: {
    colorPrimary: "#e2493b", // botón principal (CTA)
    colorBackground: "#fbf6e3", // panel de la card
    colorText: "#16110c",
    colorTextSecondary: "#6b5b43",
    colorInputBackground: "#f2e8c9",
    colorInputText: "#16110c",
    colorDanger: "#e2493b",
    colorSuccess: "#1f8a4c",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans)",
  },
  elements: {
    // Panel con el borde negro grueso + sombra dura del estilo cómic.
    card: "border-4 border-[#16110c] shadow-[7px_7px_0_#16110c] rounded-xl bg-[#fbf6e3]",
    headerTitle:
      "font-[family-name:var(--font-bangers)] tracking-wide text-3xl text-[#16110c]",
    headerSubtitle: "text-[#6b5b43]",
    socialButtonsBlockButton:
      "border-2 border-[#16110c] rounded-lg hover:bg-[#f2e8c9]",
    formButtonPrimary:
      "bg-[#e2493b] text-[#f2e8c9] border-2 border-[#16110c] rounded-lg font-semibold normal-case shadow-[3px_3px_0_#16110c] hover:bg-[#16110c] hover:text-[#f2e8c9]",
    formFieldInput:
      "border-2 border-[#16110c] rounded-lg bg-[#f2e8c9] text-[#16110c]",
    formFieldLabel: "text-[#16110c]",
    footerActionLink: "text-[#2ea8c4] hover:text-[#16110c]",
  },
};
