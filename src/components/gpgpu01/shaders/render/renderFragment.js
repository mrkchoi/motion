const shader =
  /* GLSL */
  `varying vec2 vRef;

  void main() {
    // gl_FragColor = vec4(vRef, 1.0, 1.0);
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;

export default shader;
